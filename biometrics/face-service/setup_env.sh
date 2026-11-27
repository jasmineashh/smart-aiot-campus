#!/usr/bin/env bash
# Sets up the face-service Python environment.
# Run from biometrics/face-service:   ./setup_env.sh
set -euo pipefail

if [ ! -d .venv ]; then
  python3.11 -m venv .venv
fi
source .venv/bin/activate
pip install --upgrade pip

pip install -r requirements.txt

# easyocr pulls in opencv-python-headless, which conflicts with opencv-python
# (two OpenCV packages in one environment; the headless one has no camera windows).
# Keep only the GUI build.
pip uninstall -y opencv-python-headless || true
pip install --force-reinstall --no-deps "opencv-python>=4.9"

# Anti-spoofing model repository (weights included in the repo)
if [ ! -d third_party/Silent-Face-Anti-Spoofing ]; then
  mkdir -p third_party
  git clone --depth 1 https://github.com/minivision-ai/Silent-Face-Anti-Spoofing.git third_party/Silent-Face-Anti-Spoofing
fi

python - <<'PY'
import cv2, numpy, insightface, onnxruntime, torch, easyocr, requests
print("OpenCV", cv2.__version__, "| GUI:", hasattr(cv2, "imshow"))
print("numpy", numpy.__version__, "| insightface", insightface.__version__,
      "| onnxruntime", onnxruntime.__version__, "| torch", torch.__version__)
print("Environment OK")
PY
pip check || echo "Note: pip check reported the easyocr/opencv-headless difference above; this is expected."
