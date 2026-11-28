"""
Checks the attendance duplicate-detection fix against the running backend.

  1. An OLD event (about 2 days ago), while newer events already exist
     -> must be SAVED (duplicate = false).        Before the fix this failed.
  2. The same old time + 2 minutes   -> must be a DUPLICATE (still deduplicated).
  3. The same old time - 2 minutes   -> must be a DUPLICATE (window works both ways).

Adds one historical attendance record. Run against the development database only.
Usage: python test_duplicate_fix.py --camera-id 1 --name "Nada Megahed"
"""
import argparse
import random
import sys
from datetime import datetime, timedelta, timezone

from api_client import CampusApiClient


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--camera-id", type=int, default=1)
    ap.add_argument("--name", default="Nada Megahed", help="an enrolled person's full name")
    args = ap.parse_args()

    client = CampusApiClient()
    if not client.device_key:
        sys.exit("Set DEVICE_KEY first.")
    try:
        gallery = client.device_get("/api/faces/gallery", params={"modelName": "ArcFace"}) or []
        ids = {g["personId"] for g in gallery if g["fullName"] == args.name}
        if not ids:
            sys.exit(f"No enrolled person named {args.name!r} found in the gallery.")
        person_id = ids.pop()

        # A random time about 2 days ago, so reruns don't collide with earlier runs
        base = (datetime.now(timezone.utc) - timedelta(days=2)
                - timedelta(minutes=random.randint(0, 600))).replace(microsecond=0)

        def send(when):
            res = client.device_post("/api/attendance/recognize", {
                "cameraId": args.camera_id, "personId": person_id,
                "confidence": 0.9, "result": "Recognized",
                "timestamp": when.isoformat().replace("+00:00", "Z"),
            }) or {}
            return bool(res.get("duplicate"))

        checks = [
            ("Old event while newer ones exist is saved", base, False),
            ("Same old time +2 min is a duplicate", base + timedelta(minutes=2), True),
            ("Same old time -2 min is a duplicate", base - timedelta(minutes=2), True),
        ]
        failed = 0
        for label, when, expected in checks:
            duplicate = send(when)
            ok = duplicate == expected
            failed += not ok
            print(f"{'PASS' if ok else 'FAIL'}: {label}  (duplicate={duplicate}, expected {expected})")

        print("\nAll checks passed." if not failed else f"\n{failed} check(s) failed.")
        sys.exit(1 if failed else 0)
    finally:
        client.close()


if __name__ == "__main__":
    main()