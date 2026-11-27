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

GALLERY_REFRESH_SECONDS = 300
PERSON_COOLDOWN_SECONDS = 30      # don't resend the same person more often than this
UNKNOWN_COOLDOWN_SECONDS = 60
UNKNOWN_FRAMES_NEEDED = 8         # an unknown face must stay this many processed frames


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
    ap.add_argument("--threshold", type=float, default=0.45)
    ap.add_argument("--every", type=int, default=3, help="process every Nth frame")
    args = ap.parse_args()

    client = CampusApiClient()
    if not client.device_key:
        raise SystemExit('Set DEVICE_KEY first (see the export command).')

    gallery = Gallery(client)
    gallery.refresh()

    app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
    app.prepare(ctx_id=-1, det_size=(320, 320))

    cap = cv2.VideoCapture(args.camera)
    if not cap.isOpened():
        raise SystemExit("Could not open the camera.")

    last_sent = {}           # person id or "unknown" -> time
    unknown_streak = 0
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
                for face in app.get(frame):
                    box = face.bbox.astype(int)
                    pid, name, score = gallery.match(face.normed_embedding)
                    now = time.time()

                    if pid is not None and score >= args.threshold:
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
