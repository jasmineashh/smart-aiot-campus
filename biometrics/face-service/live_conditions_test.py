"""
Live accuracy test under different conditions (lighting, angle, distance...).

For each condition the script shows an instruction, you get into position and
press SPACE, then it records 5 seconds of camera frames and measures:
  Face detected   - frames where a face was found
  Recognized      - of those, frames matched to YOU (score >= threshold)
  Wrong person    - frames matched to SOMEONE ELSE (should stay 0)
  Avg / min score - similarity to your enrolled face

Nothing is sent to the attendance API (read-only: downloads the gallery).
Results are saved to live_test_results.md for the report.

Usage (inside biometrics/face-service, .venv active, backend running):
    python live_conditions_test.py --name "Nada Megahed" --camera 0
Keys:  SPACE = start recording this condition   s = skip   q = finish early
"""
import argparse
import time
from pathlib import Path

import cv2
import numpy as np
from insightface.app import FaceAnalysis

from api_client import CampusApiClient

CONDITIONS = [
    ("Lighting", "Normal room light, face the camera"),
    ("Lighting", "Dim light (turn off a light / lower screen brightness)"),
    ("Lighting", "Strong light BEHIND you (window or lamp behind)"),
    ("Angle", "Turn your head about 30 degrees LEFT"),
    ("Angle", "Turn your head about 30 degrees RIGHT"),
    ("Angle", "Look slightly DOWN (like reading a phone)"),
    ("Distance", "Sit close, about 50 cm from the camera"),
    ("Distance", "Move back to about 1 metre"),
    ("Distance", "Move back to about 2 metres"),
    ("Other", "Wear glasses or sunglasses"),
    ("Other", "Cover your mouth with your hand (partial face)"),
]
RECORD_SECONDS = 5


def load_gallery(client):
    items = [i for i in (client.device_get("/api/faces/gallery", params={"modelName": "ArcFace"}) or [])
             if len(i["vector"]) == 512]
    m = np.vstack([np.asarray(i["vector"], dtype=np.float32) for i in items])
    return m / np.linalg.norm(m, axis=1, keepdims=True), [i["fullName"] for i in items]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--name", default="Nada Megahed", help="your enrolled full name")
    ap.add_argument("--camera", type=int, default=0)
    ap.add_argument("--threshold", type=float, default=0.40)
    ap.add_argument("--out", default="live_test_results.md")
    args = ap.parse_args()

    client = CampusApiClient()
    if not client.device_key:
        raise SystemExit("Set DEVICE_KEY first.")
    try:
        gallery, names = load_gallery(client)
    finally:
        client.close()
    if args.name not in names:
        raise SystemExit(f"{args.name!r} is not enrolled. Run enroll_me.py first.")
    print(f"Gallery: {len(names)} embeddings. Testing as {args.name}, threshold {args.threshold}")

    app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
    app.prepare(ctx_id=-1, det_size=(640, 640))
    cap = cv2.VideoCapture(args.camera)
    if not cap.isOpened():
        raise SystemExit("Could not open the camera.")

    results = []
    try:
        for group, instruction in CONDITIONS:
            # wait for SPACE
            action = None
            while action is None:
                ok, frame = cap.read()
                if not ok:
                    raise SystemExit("Camera stopped.")
                view = frame.copy()
                cv2.putText(view, f"{group}: {instruction}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 255), 2)
                cv2.putText(view, "SPACE = record 5 s   s = skip   q = finish", (10, 60),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                cv2.imshow("Live conditions test", view)
                key = cv2.waitKey(1) & 0xFF
                action = {ord(" "): "go", ord("s"): "skip", ord("q"): "quit"}.get(key)
            if action == "quit":
                break
            if action == "skip":
                continue

            frames = detected = recognized = wrong = 0
            scores = []
            end = time.time() + RECORD_SECONDS
            while time.time() < end:
                ok, frame = cap.read()
                if not ok:
                    break
                frames += 1
                faces = app.get(frame)
                if faces:
                    detected += 1
                    face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
                    sims = gallery @ face.normed_embedding
                    best = int(np.argmax(sims))
                    score = float(sims[best])
                    if score >= args.threshold:
                        if names[best] == args.name:
                            recognized += 1
                        else:
                            wrong += 1
                    own = max(float(s) for s, n in zip(sims, names) if n == args.name)
                    scores.append(own)
                    x1, y1, x2, y2 = face.bbox.astype(int)
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 200, 0), 2)
                cv2.putText(frame, f"RECORDING {max(0, end - time.time()):.1f}s", (10, 30),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 0, 255), 2)
                cv2.imshow("Live conditions test", frame)
                cv2.waitKey(1)

            row = {
                "group": group, "condition": instruction,
                "detected": 100 * detected / frames if frames else 0,
                "recognized": 100 * recognized / detected if detected else 0,
                "wrong": wrong,
                "avg": float(np.mean(scores)) if scores else 0.0,
                "min": float(np.min(scores)) if scores else 0.0,
            }
            results.append(row)
            print(f"{group:9} | {instruction[:45]:45} | detected {row['detected']:5.1f}% | "
                  f"recognized {row['recognized']:5.1f}% | wrong {wrong} | avg {row['avg']:.2f}")
    finally:
        cap.release()
        cv2.destroyAllWindows()

    lines = [
        f"# Live recognition test ({args.name})",
        "",
        f"Threshold {args.threshold}, {RECORD_SECONDS} seconds per condition, ArcFace (buffalo_l).",
        "",
        "| Group | Condition | Face detected | Recognized | Wrong person | Avg score | Min score |",
        "|---|---|---|---|---|---|---|",
    ] + [f"| {r['group']} | {r['condition']} | {r['detected']:.0f}% | {r['recognized']:.0f}% | {r['wrong']} | "
         f"{r['avg']:.2f} | {r['min']:.2f} |" for r in results]
    Path(args.out).write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"\nSaved to {args.out}")


if __name__ == "__main__":
    main()
