# Face Service — Smart Campus Biometrics

Python side of the biometric subsystem of the Secure AIoT Smart Campus platform.
It turns camera frames into identities and reports them to the ASP.NET Core backend
(`backend/Campus.Api`), which applies access rules, records attendance and raises alerts.

```
Camera ─► face detection + ArcFace embedding ─► liveness (MiniFASNet + blink)
        ─► match against enrolled faces (gallery) ─► POST /api/attendance/recognize
                                                        │
                       backend: access rules · attendance log · alerts · dashboard
```

- Faces are stored only as **512-number embeddings**, never as photos.
- Camera devices authenticate with a **device API key** (`X-Device-Key`).
- Administrative actions (creating people, cameras) need an **Admin login + CSRF token** (`api_client.py`).

---

## 1. Setup

Requirements: macOS/Linux, **Python 3.11**, git, the backend running on `http://127.0.0.1:5200`.

```bash
cd biometrics/face-service
./setup_env.sh          # creates .venv, installs requirements, fixes OpenCV, downloads anti-spoofing repo
source .venv/bin/activate
```

`setup_env.sh` also removes `opencv-python-headless` (pulled in by EasyOCR), so only one
OpenCV package (`opencv-python`, with camera windows) remains. Exact tested versions are in
`requirements-lock.txt`.

macOS notes:
- If model downloads fail with `CERTIFICATE_VERIFY_FAILED`, run
  `"/Applications/Python 3.11/Install Certificates.command"` once.
- Allow camera access for the terminal/VS Code (System Settings → Privacy & Security → Camera).
- If an iPhone is nearby, Continuity Camera may become camera `0`; use `--camera 1` for the Mac camera.

### Configuration (environment variables — never commit these)

| Variable | Used for |
|---|---|
| `DEVICE_KEY` | Device API key (same value as the backend's `Security:DeviceApiKey` user-secret) |
| `CAMPUS_ADMIN_ID` | Admin account for admin scripts (default `TEST-ADMIN-001`); the password is always asked securely |

Load the device key from the backend's user-secrets without printing it:
```bash
export DEVICE_KEY="$(cd ../../backend/Campus.Api && dotnet user-secrets list | grep DeviceApiKey | cut -d= -f2 | xargs)"
```

---

## 2. Datasets and models

Datasets live in `dataset/` and are **git-ignored** (personal images are never committed).

| Item | Source | Use |
|---|---|---|
| Pins Face Recognition (105 identities, ~17.5k images) | https://huggingface.co/datasets/AI-Solutions-KK/face_recognition_dataset (MIT) | Simulated campus members, accuracy evaluation |
| EALPR — Egyptian Automatic License Plate Recognition | https://github.com/ahmedramadan96/EALPR — cite: Youssef et al., *A New Benchmark Dataset for Egyptian License Plate Detection and Recognition*, ACIRS 2022 | Simulated vehicles for the parking integration |
| InsightFace `buffalo_l` (RetinaFace detector + ArcFace R50 recognizer + 106-point landmarks) | Downloaded automatically by InsightFace to `~/.insightface/models` | Detection, 512-d embeddings, eye landmarks for blink detection |
| Silent-Face-Anti-Spoofing (MiniFASNet) | https://github.com/minivision-ai/Silent-Face-Anti-Spoofing — cloned to `third_party/` (git-ignored), weights included | Passive liveness check |
| EasyOCR Arabic model | Downloaded by EasyOCR (`read_plates.py --allow-download`) | Reading Arabic plate characters |

Download the faces dataset:
```bash
python -c "from huggingface_hub import snapshot_download; snapshot_download('AI-Solutions-KK/face_recognition_dataset', repo_type='dataset', local_dir='dataset/pins')"
```
Download EALPR from GitHub (Code → Download ZIP), unzip it to `dataset/ealpr/`.

Roles (student, professor, worker, visitor), University IDs (`TEST-...`) and transport
(car / bus / staff bus / none) are **assigned programmatically**; no public dataset links real
faces to university roles or vehicles.

---

## 3. Scripts

| Script | What it does | Auth |
|---|---|---|
| `api_client.py` | Shared client: admin login, CSRF, device key | — |
| `camera_test.py` | Opens the camera and draws detected faces (sanity check) | none |
| `seed_demo.py` | Builds simulated campus people from Pins + EALPR, enrolls faces, creates cameras/rules, simulates attendance. **Dry run by default**; `--apply` imports | admin + device |
| `demo_plan.py` | Generates a synthetic data plan without touching the database | none |
| `read_plates.py` | OCR of plate images → `ocr_review_results.csv` (original CSV untouched) | none |
| `review_plates.py` | Manual verification of OCR plates (marks rows `Verified`) | none |
| `link_parking.py` | Links verified plates to parking accounts (same University ID). Dry run by default; `--apply` imports | device |
| `enroll_me.py` | Enrolls a real person from the webcam (5 captures → embeddings) | admin + device |
| `live_recognition.py` | Live recognition with anti-spoofing; reports to `/api/attendance/recognize` | device |
| `liveness.py` | MiniFASNet wrapper; `python liveness.py` shows REAL/SPOOF live | none |
| `blink.py` | Blink detection from 106-point landmarks; `python blink.py` shows eye openness | none |
| `evaluate_accuracy.py` | Offline accuracy evaluation on the Pins dataset → `accuracy_results.md` | none |
| `live_conditions_test.py` | Guided live test (lighting, angle, distance, occlusion) → `live_test_results.md` | device (read-only) |
| `test_*.py` | Unit/API tests (`test_duplicate_fix.py` checks backend duplicate detection) | varies |

---

## 4. Typical workflows

**Load demo data into the development database** (never production; coordinate with the team first):
```bash
python seed_demo.py --faces dataset/pins --cars "dataset/ealpr/EALPR- Plates dataset"          # dry run
python seed_demo.py --faces dataset/pins --cars "dataset/ealpr/EALPR- Plates dataset" --apply  # type IMPORT-DEMO
python read_plates.py --limit 0
python review_plates.py                      # verify plates by hand
python link_parking.py --limit 100           # dry run
python link_parking.py --limit 100 --apply
```

**Enroll a real person and run the live camera:**
```bash
python enroll_me.py --id NADA-001 --name "Nada Megahed" --type Student --department "Computer Engineering"
python live_recognition.py --camera-id 1     # 1 = Main Gate Cam in the demo data
```
Open the shared portal (`frontend`, `npm run dev`) → Attendance & Access → **Live** to watch events arrive.

---

## 5. How live recognition decides

1. **Detect** faces (RetinaFace) and compute a normalized **ArcFace** embedding.
2. **Passive liveness**: MiniFASNet real-face score must be ≥ 0.6 (`--liveness-threshold`).
3. **Match**: cosine similarity against the gallery downloaded from `/api/faces/gallery`
   (refreshed every 5 minutes). Best score ≥ **0.40** (`--threshold`) → identified.
4. **Active liveness**: the identified face must **blink** (eye-openness drop and recovery);
   a blink is valid for 10 s. No blink within 6 s → reported as **Spoof**.
5. **Report** to the backend with cooldowns (same person 30 s, unknown/spoof 60 s). The backend
   additionally deduplicates within ±5 minutes, checks access rules and visitor windows, and raises alerts.

---

## 6. Results

### Offline accuracy (Pins: 84 enrolled + 21 strangers, 3 gallery photos each, 420 genuine / 105 stranger attempts)

Rank-1 identification accuracy: **99.8%**

| Threshold | Correct accept | Wrong person | False reject | False accept (strangers) |
|---|---|---|---|---|
| 0.30 | 99.8% | 0.0% | 0.2% | 1.9% |
| 0.35 | 99.5% | 0.0% | 0.5% | 0.0% |
| **0.40** | **99.0%** | **0.0%** | **1.0%** | **0.0%** |
| 0.45 | 96.0% | 0.0% | 4.0% | 0.0% |
| 0.50 | 90.2% | 0.0% | 9.8% | 0.0% |
| 0.55 | 81.2% | 0.0% | 18.8% | 0.0% |
| 0.60 | 66.0% | 0.0% | 34.0% | 0.0% |

**Chosen threshold: 0.40** — no misidentifications or accepted strangers, with a safety margin
above 0.30 where strangers started to be accepted (the stranger sample is small: 105 attempts).

### Live test (one enrolled user, threshold 0.40, 5 s per condition)

| Condition | Recognized | Wrong person | Avg score |
|---|---|---|---|
| Normal / dim / backlit light | 100% | 0 | 0.81 |
| Head 30° left / right / looking down | 100% | 0 | 0.75 / 0.87 / 0.81 |
| Distance 0.5 m / 1 m / 2 m | 100% | 0 | 0.82 / 0.78 / 0.74 |
| Glasses | 100% | 0 | 0.61 |
| Hand covering mouth | 100% | 0 | 0.63 |

### Anti-spoofing

| Attack | MiniFASNet only | MiniFASNet + blink |
|---|---|---|
| Printed photo | Not detected (score 1.00) | **Detected → Spoof alert** |
| Real face | Accepted | Accepted after a blink |

---

## 7. Limitations and future work

- Evaluation used celebrity photos and one live user; a larger test with real campus volunteers is needed.
- The camera's automatic exposure may have softened the lighting tests; harsher conditions (night, direct sun) are untested.
- Blink detection stops photos and still screens but **not a replayed video**; depth sensing or random
  challenges (turn head, smile) would be needed.
- MiniFASNet alone did not reject printed photos with the iPhone camera; it is kept as an extra layer.
- Plate OCR with EasyOCR is weak on small Arabic letters (10 of 37 plates read confidently), so
  plates are verified manually before linking; a dedicated plate model would improve this.
- The backend currently allows everyone at cameras without access rules; reviewing this default is pending.
