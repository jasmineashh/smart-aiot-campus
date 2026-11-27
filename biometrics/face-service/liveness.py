"""
Liveness (anti-spoofing) check using Silent-Face-Anti-Spoofing (MiniFASNet).

Repository: https://github.com/minivision-ai/Silent-Face-Anti-Spoofing
Clone it into third_party/Silent-Face-Anti-Spoofing (see setup instructions).
The face box comes from InsightFace; MiniFASNet decides real face vs photo/screen.

Quick test:  python liveness.py      (opens the webcam, shows REAL / SPOOF)
"""
import os
import sys
from contextlib import contextmanager
from pathlib import Path

import numpy as np

REPO = Path(__file__).resolve().parent / "third_party" / "Silent-Face-Anti-Spoofing"


@contextmanager
def _inside(path: Path):
    old = os.getcwd()
    os.chdir(path)
    try:
        yield
    finally:
        os.chdir(old)


class LivenessChecker:
    def __init__(self, repo: Path = REPO, threshold: float = 0.6):
        if not (repo / "src").is_dir():
            raise SystemExit(f"Anti-spoofing repo not found at {repo}. See setup instructions.")
        sys.path.insert(0, str(repo))
        from src.anti_spoof_predict import AntiSpoofPredict
        from src.generate_patches import CropImage
        from src.utility import parse_model_name

        self.threshold = threshold
        self.parse_model_name = parse_model_name
        self.cropper = CropImage()
        self.model_dir = repo / "resources" / "anti_spoof_models"
        self.models = sorted(p.name for p in self.model_dir.glob("*.pth"))
        if not self.models:
            raise SystemExit(f"No .pth weights found in {self.model_dir}")
        # Skip the library's own Caffe face detector (removed in OpenCV 5, and InsightFace
        # already gives us the face box): create the predictor without its __init__.
        import torch
        self.predictor = AntiSpoofPredict.__new__(AntiSpoofPredict)
        self.predictor.device = torch.device("cpu")

    def check(self, frame, bbox):
        """bbox = InsightFace face.bbox (x1, y1, x2, y2). Returns (is_real, real_score)."""
        x1, y1, x2, y2 = [int(v) for v in bbox]
        h_img, w_img = frame.shape[:2]
        x1, y1 = max(0, x1), max(0, y1)
        x2, y2 = min(w_img - 1, x2), min(h_img - 1, y2)
        box = [x1, y1, max(1, x2 - x1), max(1, y2 - y1)]  # library expects [x, y, w, h]

        prediction = np.zeros((1, 3))
        for name in self.models:
            h_in, w_in, _, scale = self.parse_model_name(name)
            crop = self.cropper.crop(org_img=frame, bbox=box, scale=scale or 1,
                                     out_w=w_in, out_h=h_in, crop=scale is not None)
            prediction += self.predictor.predict(crop, str(self.model_dir / name))
        real_score = float(prediction[0][1] / len(self.models))  # class 1 = real face
        return real_score >= self.threshold, real_score


if __name__ == "__main__":
    import cv2
    from insightface.app import FaceAnalysis

    app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
    app.prepare(ctx_id=-1, det_size=(320, 320))
    checker = LivenessChecker()
    cap = cv2.VideoCapture(0)
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        for face in app.get(frame):
            real, score = checker.check(frame, face.bbox)
            x1, y1, x2, y2 = face.bbox.astype(int)
            color = (0, 200, 0) if real else (0, 0, 255)
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            cv2.putText(frame, f"{'REAL' if real else 'SPOOF'} {score:.2f}", (x1, max(20, y1 - 8)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
        cv2.imshow("Liveness test (q to quit)", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break
    cap.release()
    cv2.destroyAllWindows()
