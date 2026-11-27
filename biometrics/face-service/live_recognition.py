"""
Live face recognition from the webcam.

Downloads enrolled faces (gallery) from the backend, recognizes faces in the
camera, and reports each result to /api/attendance/recognize. The backend then
applies access rules, records attendance and raises alerts.

Uses only the device key (no admin login), like a real camera device.

Usage (inside biometrics/face-service, .venv active, backend running):
    python live_recognition.py --camera-id 1
Keys:  q = quit
"""
import argparse
import time

import cv2
import numpy as np
from insightface.app import FaceAnalysis

from api_client import CampusApiClient
from blink import BlinkTracker, eye_openness
from liveness import LivenessChecker

GALLERY_REFRESH_SECONDS = 300
PERSON_COOLDOWN_SECONDS = 30      # don't resend the same person more often than this
UNKNOWN_COOLDOWN_SECONDS = 60
UNKNOWN_FRAMES_NEEDED = 8         # an unknown face must stay this many processed frames
SPOOF_FRAMES_NEEDED = 5           # a fake face must be detected this many processed frames in a row
SPOOF_COOLDOWN_SECONDS = 60
BLINK_VALID_SECONDS = 10          # a blink proves liveness for this long
BLINK_TIMEOUT_SECONDS = 6         # recognized but no blink for this long -> treated as spoof
TRACK_FORGET_SECONDS = 3          # forget a person's blink state if they leave the frame


class Gallery:
    def __init__(self, client):
        self.client = client
        self.loaded_at = 0.0
        self.matrix = np.zeros((0, 512), dtype=np.float32)
        self.person_ids, self.names = [], []

    def refresh(self):
        items = self.client.device_get("/api/faces/gallery", params={"modelName": "ArcFace"}) or []
        vectors = [np.asarray(i["vector"], dtype=np.float32) for i in items if len(i["vector"]) == 512]
        items = [i for i in items if len(i["vector"]) == 512]
        if vectors:
            m = np.vstack(vectors)
            self.matrix = m / np.linalg.norm(m, axis=1, keepdims=True)
        else:
            self.matrix = np.zeros((0, 512), dtype=np.float32)
        self.person_ids = [i["personId"] for i in items]
        self.names = [i["fullName"] for i in items]
        self.loaded_at = time.time()
        print(f"Gallery loaded: {len(items)} embeddings, {len(set(self.person_ids))} people")

    def match(self, embedding):
        if len(self.matrix) == 0:
            return None, None, 0.0
        scores = self.matrix @ embedding
        best = int(np.argmax(scores))
        return self.person_ids[best], self.names[best], float(scores[best])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--camera-id", type=int, required=True, help="backend Camera id this device represents")
    ap.add_argument("--camera", type=int, default=0, help="local webcam index")
    ap.add_argument("--threshold", type=float, default=0.40)
    ap.add_argument("--every", type=int, default=2, help="process every Nth frame (lower = catches blinks better)")
    ap.add_argument("--liveness-threshold", type=float, default=0.6)
    ap.add_argument("--no-liveness", action="store_true", help="disable MiniFASNet check")
    ap.add_argument("--no-blink", action="store_true", help="disable blink check (not recommended)")
    args = ap.parse_args()

    client = CampusApiClient()
    if not client.device_key:
        raise SystemExit('Set DEVICE_KEY first (see the export command).')

    gallery = Gallery(client)
    gallery.refresh()

    app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
    app.prepare(ctx_id=-1, det_size=(320, 320))

    liveness = None if args.no_liveness else LivenessChecker(threshold=args.liveness_threshold)

    cap = cv2.VideoCapture(args.camera)
    if not cap.isOpened():
        raise SystemExit("Could not open the camera.")

    last_sent = {}           # person id or "unknown" -> time
    unknown_streak = 0
    spoof_streak = 0
    trackers = {}            # person id -> BlinkTracker
    labels = []              # (box, text, color) from the last processed frame
    status_line = ""
    frame_no = 0

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            frame_no += 1

            if time.time() - gallery.loaded_at > GALLERY_REFRESH_SECONDS:
                gallery.refresh()

            if frame_no % args.every == 0:
                labels = []
                saw_unknown = False
                saw_spoof = False
                for face in app.get(frame):
                    box = face.bbox.astype(int)
                    now = time.time()

                    if liveness is not None:
                        real, live_score = liveness.check(frame, face.bbox)
                        if not real:
                            saw_spoof = True
                            labels.append((box, f"SPOOF {live_score:.2f}", (0, 0, 255)))
                            continue  # never recognize a fake face

                    pid, name, score = gallery.match(face.normed_embedding)

                    if pid is not None and score >= args.threshold:
                        if not args.no_blink:
                            tr = trackers.get(pid)
                            if tr is None or now - tr.last_seen > TRACK_FORGET_SECONDS:
                                tr = trackers[pid] = BlinkTracker()
                            tr.update(eye_openness(face))
                            if now - tr.last_blink > BLINK_VALID_SECONDS:
                                if now - tr.first_seen > BLINK_TIMEOUT_SECONDS:
                                    saw_spoof = True
                                    labels.append((box, f"{name}: NO BLINK - SPOOF?", (0, 0, 255)))
                                    tr.first_seen = now
                                else:
                                    labels.append((box, f"{name} - please blink", (0, 200, 255)))
                                continue
                        labels.append((box, f"{name} {score:.2f}", (0, 200, 0)))
                        if now - last_sent.get(pid, 0) >= PERSON_COOLDOWN_SECONDS:
                            last_sent[pid] = now
                            res = client.device_post("/api/attendance/recognize", {
                                "cameraId": args.camera_id, "personId": pid,
                                "confidence": round(score, 3), "result": "Recognized",
                            }) or {}
                            verdict = "ALLOWED" if res.get("allowed") else "DENIED"
                            if res.get("duplicate"):
                                verdict += " (already logged)"
                            status_line = f"{name}: {verdict}"
                            if res.get("alert"):
                                status_line += f" - {res['alert']}"
                            print(status_line)
                    else:
                        saw_unknown = True
                        labels.append((box, f"Unknown {score:.2f}", (0, 0, 255)))

                spoof_streak = spoof_streak + 1 if saw_spoof else 0
                if any("NO BLINK" in t for _, t, _ in labels):
                    spoof_streak = SPOOF_FRAMES_NEEDED  # a failed blink check is reported at once
                if spoof_streak >= SPOOF_FRAMES_NEEDED and \
                        time.time() - last_sent.get("spoof", 0) >= SPOOF_COOLDOWN_SECONDS:
                    last_sent["spoof"] = time.time()
                    res = client.device_post("/api/attendance/recognize", {
                        "cameraId": args.camera_id, "personId": None,
                        "confidence": 0.0, "result": "Spoof",
                    }) or {}
                    status_line = "SPOOF attempt reported" + (f" - {res['alert']}" if res.get("alert") else "")
                    print(status_line)
                    spoof_streak = 0

                unknown_streak = unknown_streak + 1 if saw_unknown else 0
                if unknown_streak >= UNKNOWN_FRAMES_NEEDED and \
                        time.time() - last_sent.get("unknown", 0) >= UNKNOWN_COOLDOWN_SECONDS:
                    last_sent["unknown"] = time.time()
                    res = client.device_post("/api/attendance/recognize", {
                        "cameraId": args.camera_id, "personId": None,
                        "confidence": 0.0, "result": "Unknown",
                    }) or {}
                    status_line = "Unknown person reported" + (f" - {res['alert']}" if res.get("alert") else "")
                    print(status_line)
                    unknown_streak = 0

            for box, text, color in labels:
                x1, y1, x2, y2 = box
                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                cv2.putText(frame, text, (x1, max(20, y1 - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
            cv2.putText(frame, status_line or "Watching...  (q to quit)", (10, 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
            cv2.imshow("Live recognition", frame)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break
    finally:
        cap.release()
        cv2.destroyAllWindows()
        client.close()


if __name__ == "__main__":
    main()
