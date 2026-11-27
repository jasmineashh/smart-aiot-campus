"""
Manual plate verification for ocr_review_results.csv.

For each car plate that is not verified yet, the script opens the plate photo,
shows what OCR read, and asks you to confirm or type the correct plate.
Confirmed rows get PlateStatus = "Verified", which link_parking.py requires.

Usage (inside biometrics/face-service, .venv active):
    python review_plates.py
Keys:  Enter = OCR is correct   |  type a plate = use that instead
       s = skip                 |  q = save and quit
"""
import argparse
import csv
import shutil
import subprocess
import sys
from pathlib import Path

from plate_utils import normalize_plate

REVIEWABLE = {"Candidate", "NeedsReview", "ConflictingCandidates", "DuplicatePlate"}


def open_image(path: Path):
    if sys.platform == "darwin":
        subprocess.run(["open", "-g", str(path)], check=False)  # -g: keep the terminal in front
    else:
        print(f"  (open this image yourself: {path})")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", default="ocr_review_results.csv")
    args = ap.parse_args()
    path = Path(args.csv)
    if not path.is_file():
        sys.exit(f"{path} not found. Run read_plates.py first.")

    with path.open(newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        fields = list(reader.fieldnames or [])
        rows = list(reader)

    todo = [r for r in rows if r.get("PlateStatus") in REVIEWABLE and r.get("CarImage")]
    print(f"{len(todo)} plates to review.\n")

    backup = path.with_suffix(".backup.csv")
    shutil.copyfile(path, backup)

    verified = skipped = 0
    try:
        for i, row in enumerate(todo, 1):
            image = Path(row["CarImage"])
            print(f"[{i}/{len(todo)}] {row['UniversityId']} {row['FullName']}")
            print(f"  OCR read: {row.get('PlateNumber') or '(nothing)'}   status: {row['PlateStatus']}")
            open_image(image)
            while True:
                answer = input("  Enter = correct | type plate | s = skip | q = quit: ").strip()
                if answer.lower() == "q":
                    raise KeyboardInterrupt
                if answer.lower() == "s":
                    skipped += 1
                    break
                plate = normalize_plate(answer or row.get("PlateNumber", ""))
                if not plate:
                    print("  Not a valid Egyptian plate. Try again (letters then digits, e.g. ط ب ج 3945).")
                    continue
                if any(r is not row and r.get("PlateStatus") == "Verified" and r.get("PlateNumber") == plate
                       for r in rows):
                    print("  This plate is already verified for another person. Type a different one or s.")
                    continue
                row["PlateNumber"] = plate
                row["PlateStatus"] = "Verified"
                verified += 1
                print(f"  ✓ Verified: {plate}")
                break
    except KeyboardInterrupt:
        print("\nStopping, saving what you reviewed so far...")
    finally:
        with path.open("w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=fields)
            writer.writeheader()
            writer.writerows(rows)
        print(f"\n✓ {verified} verified, {skipped} skipped → saved to {path} (backup: {backup})")


if __name__ == "__main__":
    main()
