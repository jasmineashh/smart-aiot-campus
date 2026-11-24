
"""
Egyptian license plate OCR for Smart Campus.

The script reads cropped license plate images,
normalizes OCR results, and creates a separate CSV.

It does not modify the original mapping CSV
or communicate with the campus database.
"""

import argparse
import csv
from collections import Counter
from pathlib import Path

import cv2
import numpy as np

from plate_utils import (
    ARABIC_LETTER,
    normalize_digits,
    normalize_plate,
)


def prepare_images(path):
    try:
        raw = np.fromfile(str(path), dtype=np.uint8)
        image = cv2.imdecode(
            raw,
            cv2.IMREAD_COLOR,
        )
    except (OSError, cv2.error):
        return []

    if image is None or image.size == 0:
        return []

    height = image.shape[0]

    cropped = image[int(height * 0.30):, :]

    variants = []

    for source in (cropped, image):
        if source.size == 0:
            continue

        gray = cv2.cvtColor(
            source,
            cv2.COLOR_BGR2GRAY,
        )

        gray = cv2.resize(
            gray,
            None,
            fx=3,
            fy=3,
            interpolation=cv2.INTER_CUBIC,
        )

        variants.append(gray)

        clahe = cv2.createCLAHE(
            clipLimit=2.0,
            tileGridSize=(8, 8),
        )

        variants.append(clahe.apply(gray))

    return variants


def extract_candidate(results):
    letters = []
    digits = []
    confidences = []

    for _, text, confidence in results:
        text = text.replace(
            "\u0645\u0635\u0631", ""
        )

        text = text.upper().replace(
            "EGYPT", ""
        )

        text = normalize_digits(text)

        found_letters = [
            char for char in text
            if ARABIC_LETTER.fullmatch(char)
        ]

        found_digits = [
            char for char in text
            if char in "0123456789"
        ]

        if found_letters or found_digits:
            letters.extend(found_letters)
            digits.extend(found_digits)
            confidences.append(float(confidence))

    raw_plate = (
        "".join(letters)
        + " "
        + "".join(digits)
    ).strip()

    normalized = normalize_plate(raw_plate)

    confidence = (
        sum(confidences) / len(confidences)
        if confidences else 0.0
    )

    return normalized, confidence, raw_plate


def read_plate(reader, path, threshold=0.70):
    images = prepare_images(path)

    if not images:
        return "", 0.0, "ImageError", ""

    candidates = []

    for image in images:
        results = reader.readtext(
            image,
            detail=1,
            paragraph=False,
        )

        candidates.append(
            extract_candidate(results)
        )

    valid = [
        candidate for candidate in candidates
        if candidate[0]
    ]

    if not valid:
        best = max(
            candidates,
            key=lambda item: item[1],
        )

        return (
            "",
            round(best[1], 3),
            "NeedsReview",
            best[2],
        )

    best = max(
        valid,
        key=lambda item: item[1],
    )

    plate, confidence, raw = best

    recognized_plates = {
        candidate[0]
        for candidate in valid
        if candidate[1] >= threshold
    }

    if len(recognized_plates) > 1:
        status = "ConflictingCandidates"
    elif confidence < threshold:
        status = "NeedsReview"
    else:
        status = "Candidate"

    return (
        plate,
        round(confidence, 3),
        status,
        raw,
    )


def process_csv(
    reader,
    input_path,
    output_path,
    image_column,
    threshold,
    limit,
):
    input_path = Path(input_path)
    output_path = Path(output_path)

    if input_path.resolve() == output_path.resolve():
        raise SystemExit(
            "Input and output CSV must be different."
        )

    if output_path.exists():
        raise SystemExit(
            "Output already exists. Choose a new file."
        )

    with input_path.open(
        newline="",
        encoding="utf-8-sig",
    ) as file:
        csv_reader = csv.DictReader(file)
        fields = list(csv_reader.fieldnames or [])
        rows = list(csv_reader)

    if not rows:
        raise SystemExit("Input CSV is empty.")

    if image_column not in fields:
        raise SystemExit(
            f"Missing CSV column: {image_column}"
        )

    for field in (
        "PlateNumber",
        "PlateConfidence",
        "PlateStatus",
        "RawOcrText",
    ):
        if field not in fields:
            fields.append(field)

    processed = 0

    for row in rows:
        row["PlateNumber"] = ""
        row["PlateConfidence"] = ""
        row["RawOcrText"] = ""

        image = row.get(image_column, "").strip()

        if not image:
            row["PlateStatus"] = "NoImage"
            continue

        if limit and processed >= limit:
            row["PlateStatus"] = "NotProcessed"
            continue

        image_path = Path(image)

        if not image_path.is_absolute():
            relative = input_path.parent / image_path

            if relative.exists():
                image_path = relative

        plate, confidence, status, raw = read_plate(
            reader,
            image_path,
            threshold,
        )

        row["PlateNumber"] = plate
        row["PlateConfidence"] = str(confidence)
        row["PlateStatus"] = status
        row["RawOcrText"] = raw

        processed += 1

        print(
            f"[{processed}] "
            f"{status}, confidence={confidence}"
        )

    plate_counts = Counter(
        row["PlateNumber"]
        for row in rows
        if row["PlateNumber"]
    )

    for row in rows:
        plate = row["PlateNumber"]

        if plate and plate_counts[plate] > 1:
            row["PlateStatus"] = "DuplicatePlate"

    output_path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with output_path.open(
        "x",
        newline="",
        encoding="utf-8-sig",
    ) as file:
        writer = csv.DictWriter(
            file,
            fieldnames=fields,
        )

        writer.writeheader()
        writer.writerows(rows)

    summary = Counter(
        row["PlateStatus"]
        for row in rows
    )

    print("\nOCR processing summary:")

    for status, count in sorted(summary.items()):
        print(f"{status}: {count}")

    print(f"\nResults saved to: {output_path}")
    print("Original CSV was not modified.")
    print("Candidates require manual verification.")


def main():
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--csv",
        default="people_mapping.csv",
    )

    parser.add_argument(
        "--output",
        default="ocr_review_results.csv",
    )

    parser.add_argument(
        "--column",
        default="CarImage",
    )

    parser.add_argument("--image")

    parser.add_argument(
        "--threshold",
        type=float,
        default=0.70,
    )

    parser.add_argument(
        "--limit",
        type=int,
        default=10,
    )

    parser.add_argument(
        "--allow-download",
        action="store_true",
    )

    args = parser.parse_args()

    if not 0 <= args.threshold <= 1:
        parser.error(
            "Threshold must be between 0 and 1."
        )

    if args.limit < 0:
        parser.error(
            "Limit cannot be negative."
        )

    if args.image:
        if not Path(args.image).is_file():
            parser.error("Image file does not exist.")
    elif not Path(args.csv).is_file():
        parser.error("Input CSV does not exist.")

    import easyocr

    reader = easyocr.Reader(
        ["ar"],
        gpu=False,
        verbose=False,
        download_enabled=args.allow_download,
    )

    if args.image:
        result = read_plate(
            reader,
            Path(args.image),
            args.threshold,
        )

        plate, confidence, status, raw = result

        print("Normalized plate:", plate)
        print("Confidence:", confidence)
        print("Status:", status)
        print("Raw OCR:", raw)
        return

    process_csv(
        reader,
        args.csv,
        args.output,
        args.column,
        args.threshold,
        args.limit,
    )


if __name__ == "__main__":
    main()
