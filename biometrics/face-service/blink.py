"""
Active liveness: blink detection with InsightFace's 106-point landmarks.

A printed photo or a still screen cannot blink. We measure how open each eye is
(eye height / eye width from the landmark points) and detect a blink as a quick
drop followed by recovery, relative to that person's own "eyes open" baseline.

Quick test (shows the eye points and the openness value):
    python blink.py --camera 0
"""
import time

import numpy as np

# Eye point indices in InsightFace's 2d106 landmark layout
LEFT_EYE = list(range(33, 43))
RIGHT_EYE = list(range(87, 97))

CLOSED_RATIO = 0.65   # eye counts as closed below 65% of the open baseline
OPEN_RATIO = 0.85     # and open again above 85%


def eye_openness(face):
    """Average eye height/width of both eyes, or None if landmarks are missing."""
    lm = getattr(face, "landmark_2d_106", None)
    if lm is None:
        return None
    values = []
    for idx in (LEFT_EYE, RIGHT_EYE):
        pts = lm[idx]
        width = pts[:, 0].max() - pts[:, 0].min()
        height = pts[:, 1].max() - pts[:, 1].min()
        if width > 1:
            values.append(height / width)
    return float(np.mean(values)) if values else None


class BlinkTracker:
    """Tracks one face over time and reports when it blinks."""

    def __init__(self):
        self.baseline = None
        self.closed = False
        self.first_seen = time.time()
        self.last_seen = time.time()
        self.last_blink = 0.0

    def update(self, openness):
        now = time.time()
        self.last_seen = now
        if openness is None:
            return False
        # baseline follows the open-eye value (slowly decays so it adapts to the person)
        if self.baseline is None or openness > self.baseline:
            self.baseline = openness
        else:
            self.baseline = 0.98 * self.baseline + 0.02 * openness
        if not self.closed and openness < CLOSED_RATIO * self.baseline:
            self.closed = True
        elif self.closed and openness > OPEN_RATIO * self.baseline:
            self.closed = False
            self.last_blink = now
            return True
        return False


if __name__ == "__main__":
    import argparse

    import cv2
    from insightface.app import FaceAnalysis

    ap = argparse.ArgumentParser()
    ap.add_argument("--camera", type=int, default=0)
    args = ap.parse_args()

    app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
    app.prepare(ctx_id=-1, det_size=(320, 320))
    cap = cv2.VideoCapture(args.camera)
    tracker = BlinkTracker()
    blinks = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        faces = app.get(frame)
        if faces:
            face = max(faces, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
            value = eye_openness(face)
            if tracker.update(value):
                blinks += 1
            for i in LEFT_EYE + RIGHT_EYE:
                x, y = face.landmark_2d_106[i].astype(int)
                cv2.circle(frame, (x, y), 1, (0, 255, 255), -1)
            text = f"openness {value:.2f}  baseline {tracker.baseline:.2f}  blinks {blinks}" if value else "no landmarks"
            cv2.putText(frame, text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
        cv2.imshow("Blink test (q to quit)", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break
    cap.release()
    cv2.destroyAllWindows()
