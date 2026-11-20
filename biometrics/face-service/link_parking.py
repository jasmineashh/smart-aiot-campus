"""
Link the biometrics people to the parking system.

Reads people_mapping.csv and, for everyone whose transport is "Car", creates a
user account with the same UniversityId and registers their plate as a Vehicle.

Usage (inside biometrics/face-service, .venv active, backend running):
    export DEVICE_KEY="..."
    python link_parking.py
"""
import csv
import os
import sys

import requests

API = os.environ.get("CAMPUS_API", "http://localhost:5200").rstrip("/")
KEY = os.environ.get("DEVICE_KEY")
ROLE_NAME = {"Student": "Student", "Professor": "Staff", "Worker": "Staff", "Visitor": "Visitor"}


def main(path="people_mapping.csv"):
    if not KEY:
        sys.exit('Set the device key first:  export DEVICE_KEY="..."')

    with open(path, newline="", encoding="utf-8") as f:
        rows = [r for r in csv.DictReader(f) if r.get("Transport") == "Car"]
    if not rows:
        sys.exit(f"No car owners in {path}. Run seed_demo.py first.")

    owners = []
    for r in rows:
        plate = (r.get("PlateNumber") or "").strip()
        if not plate:  # OCR could not read it: keep a placeholder linked to the image
            image = os.path.basename(r.get("CarImage", ""))
            plate = "UNREAD-" + image.split("_")[0]
        owners.append({
            "universityId": r["UniversityId"],
            "fullName": r["FullName"],
            "department": r.get("Department") or None,
            "role": ROLE_NAME.get(r.get("Role", ""), "Student"),
            "plateNumber": plate,
        })

    resp = requests.post(f"{API}/api/dev/integration/car-owners", json=owners,
                         headers={"X-Device-Key": KEY}, timeout=120)
    if resp.status_code >= 400:
        sys.exit(f"Failed: {resp.status_code} {resp.text[:300]}")

    result = resp.json()
    print(f"✓ {result['accountsCreated']} accounts created, {result['carsAdded']} cars registered")
    for s in result.get("skipped", []):
        print("  skipped:", s)


if __name__ == "__main__":
    main()
