"""
Read Egyptian license plates with EasyOCR and fill the PlateNumber column
of people_mapping.csv.

Usage (inside biometrics/face-service, with .venv active):
    pip install easyocr
    python read_plates.py --image "dataset/ealpr/EALPR- Plates dataset/0001_license_plate_1.png"   # test one plate
    python read_plates.py                                                                          # fill the CSV
"""
import argparse
import csv
import re
from pathlib import Path

import cv2

ARABIC_LETTER = re.compile(r"[ء-ي]")
# Eastern Arabic digits (as printed on Egyptian plates) -> Western digits
DIGITS = str.maketrans("٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹", "01234567890123456789")


def prepare(path: Path):
    img = cv2.imread(str(path))
    if img is None:
        return None
    h = img.shape[0]
    img = img[int(h * 0.30):, :]          # cut off the blue "مصر EGYPT" band at the top
    img = cv2.resize(img, None, fx=3, fy=3, interpolation=cv2.INTER_CUBIC)
    return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)


def read_plate(reader, path: Path):
    """Returns (plate_text, average_confidence, status)."""
    img = prepare(path)
    if img is None:
        return "", 0.0, "ImageError"

    letters, digits, confs = [], [], []
    for _, text, conf in reader.readtext(img, detail=1, paragraph=False):
        text = text.replace("مصر", "").replace("EGYPT", "").translate(DIGITS)
        found_letters = [ch for ch in text if ARABIC_LETTER.match(ch)]
        found_digits = [ch for ch in text if ch.isdigit()]
        if found_letters or found_digits:
            letters += found_letters
            digits += found_digits
            confs.append(conf)

    plate = " ".join(letters)
    if digits:
        plate = (plate + " " + "".join(digits)).strip()
    confidence = round(sum(confs) / len(confs), 2) if confs else 0.0

    # Egyptian plates: 1-3 Arabic letters and 1-4 digits
    valid = 1 <= len(letters) <= 3 and 1 <= len(digits) <= 4
    status = "OK" if valid and confidence >= 0.5 else "NeedsReview"
    return plate, confidence, status


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", default="people_mapping.csv")
    ap.add_argument("--column", default="CarImage", help="CSV column with the plate image path")
    ap.add_argument("--image", help="read one image and print the result (for testing)")
    args = ap.parse_args()

    import easyocr
    print("Loading the Arabic OCR model (downloads once)...")
    reader = easyocr.Reader(["ar"], gpu=False, verbose=False)

    if args.image:
        print(read_plate(reader, Path(args.image)))
        return

    with open(args.csv, newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    if not rows:
        raise SystemExit(f"{args.csv} is empty. Run seed_demo.py first.")

    fields = list(rows[0].keys())
    for extra in ("PlateConfidence", "PlateStatus"):
        if extra not in fields:
            fields.append(extra)

    ok = review = 0
    for i, row in enumerate(rows, 1):
        image = row.get(args.column, "")
        if not image:
            continue  # visitors have no car
        plate, conf, status = read_plate(reader, Path(image))
        row["PlateNumber"], row["PlateConfidence"], row["PlateStatus"] = plate, conf, status
        ok += status == "OK"
        review += status != "OK"
        print(f"  [{i}/{len(rows)}] {row['UniversityId']}: {plate or '—'}  ({status}, {conf})")

    with open(args.csv, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
    print(f"✓ Plates read: {ok} OK, {review} need review → saved to {args.csv}")


if __name__ == "__main__":
    main()
