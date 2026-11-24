
"""
Prepare a small synthetic Smart Campus demo dataset.

This script does not:
- Connect to the backend
- Modify the database
- Download AI models
- Process real biometric information
"""

import argparse
import csv
import random

from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo


CAIRO = ZoneInfo("Africa/Cairo")

DEPARTMENTS = [
    "Computer Engineering",
    "Electrical Engineering",
    "Mechanical Engineering",
]

CAMERAS = [
    ("Demo Main Gate", "G-Entrance"),
    ("Demo Laboratory", "G-041"),
    ("Demo Lecture Room", "G-345"),
    ("Demo Student Bus", "BUS-1"),
    ("Demo Staff Bus", "BUS-STAFF"),
]

ROLES = [
    ("Student", "Student"),
    ("Professor", "Staff"),
    ("Worker", "Staff"),
    ("Visitor", "Visitor"),
]


def build_people(count, seed=42):
    rng = random.Random(seed)
    people = []

    for index in range(1, count + 1):
        role, person_type = ROLES[
            (index - 1) % len(ROLES)
        ]

        department = (
            rng.choice(DEPARTMENTS)
            if role != "Visitor"
            else ""
        )

        if role == "Visitor":
            transport = "None"
        elif role == "Student":
            transport = rng.choice(
                ["Car", "Bus 1", "Bus 2"]
            )
        else:
            transport = rng.choice(
                ["Car", "Staff Bus"]
            )

        people.append({
            "UniversityId": f"DEMO-AI-{index:04d}",
            "FullName": f"Synthetic Demo Person {index:04d}",
            "Role": role,
            "Type": person_type,
            "Department": department,
            "FaceFolder": "",
            "Transport": transport,
            "CarImage": "",
            "PlateNumber": "",
            "PlateStatus": "NotProcessed",
            "DataSource": "Synthetic",
        })

    return people


def validate_people(people):
    ids = [
        person["UniversityId"]
        for person in people
    ]

    if len(ids) != len(set(ids)):
        raise ValueError(
            "Duplicate university IDs detected."
        )

    if any(
        not identifier.startswith("DEMO-AI-")
        for identifier in ids
    ):
        raise ValueError(
            "Unexpected university ID namespace."
        )

    if any(
        person["DataSource"] != "Synthetic"
        for person in people
    ):
        raise ValueError(
            "Only synthetic records are permitted."
        )

    if any(
        person["PlateNumber"]
        for person in people
    ):
        raise ValueError(
            "Unverified plates cannot be assigned."
        )


def write_csv(path, rows):
    if not rows:
        raise ValueError("No rows to write.")

    with path.open(
        "x",
        newline="",
        encoding="utf-8-sig",
    ) as file:
        writer = csv.DictWriter(
            file,
            fieldnames=list(rows[0].keys()),
        )

        writer.writeheader()
        writer.writerows(rows)


def main():
    parser = argparse.ArgumentParser(
        description="Prepare local synthetic demo data."
    )

    parser.add_argument(
        "--people",
        type=int,
        default=8,
    )

    parser.add_argument(
        "--seed",
        type=int,
        default=42,
    )

    parser.add_argument(
        "--output",
        default="output/demo_plan",
    )

    args = parser.parse_args()

    if not 4 <= args.people <= 100:
        parser.error(
            "People count must be between 4 and 100."
        )

    people = build_people(
        args.people,
        args.seed,
    )

    validate_people(people)

    output = Path(args.output)

    output.mkdir(
        parents=True,
        exist_ok=False,
    )

    write_csv(
        output / "people_mapping.csv",
        people,
    )

    cameras = [
        {
            "Name": name,
            "Location": location,
            "DataSource": "Synthetic",
        }
        for name, location in CAMERAS
    ]

    write_csv(
        output / "cameras.csv",
        cameras,
    )

    print("Synthetic demo plan created.")
    print("Cairo time:", datetime.now(CAIRO))
    print("People:", len(people))
    print("Cameras:", len(cameras))
    print("Output directory:", output)
    print("No API requests sent.")
    print("No database records modified.")
    print("No biometric data processed.")


if __name__ == "__main__":
    main()
