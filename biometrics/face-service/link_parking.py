
"""
Link verified demo vehicle plates to campus accounts.

Default mode is a local dry run.
Database imports require --apply, a valid device key,
and explicit backend development import permission.
"""

import argparse
import csv
from collections import Counter
from getpass import getpass
from pathlib import Path

from api_client import CampusApiClient
from plate_utils import normalize_plate


ROLE_MAP = {
    "student": "Student",
    "professor": "Professor",
    "worker": "Staff",
    "staff": "Staff",
}

MAX_BATCH_SIZE = 500


def load_rows(path):
    with Path(path).open(
        newline="",
        encoding="utf-8-sig",
    ) as file:
        reader = csv.DictReader(file)

        required = {
            "UniversityId",
            "FullName",
            "Role",
            "Transport",
            "PlateNumber",
            "PlateStatus",
        }

        missing = required - set(
            reader.fieldnames or []
        )

        if missing:
            raise ValueError(
                "Missing CSV columns: "
                + ", ".join(sorted(missing))
            )

        return list(reader)


def clean(value):
    return (value or "").strip()


def prepare_owners(rows):
    candidates = []
    skipped = Counter()

    for row in rows:
        transport = clean(
            row.get("Transport")
        ).casefold()

        if transport != "car":
            skipped["NotCarOwner"] += 1
            continue

        university_id = clean(
            row.get("UniversityId")
        )

        full_name = clean(
            row.get("FullName")
        )

        role = ROLE_MAP.get(
            clean(row.get("Role")).casefold()
        )

        if not university_id or not full_name:
            skipped["MissingOwnerInformation"] += 1
            continue

        if role is None:
            skipped["UnsupportedRole"] += 1
            continue

        status = clean(
            row.get("PlateStatus")
        )

        if status != "Verified":
            skipped["PlateNotVerified"] += 1
            continue

        plate = normalize_plate(
            clean(row.get("PlateNumber"))
        )

        if not plate:
            skipped["InvalidPlate"] += 1
            continue

        candidates.append({
            "universityId": university_id,
            "fullName": full_name,
            "department": clean(
                row.get("Department")
            ) or None,
            "role": role,
            "plateNumber": plate,
        })

    plate_counts = Counter(
        owner["plateNumber"]
        for owner in candidates
    )

    owners = []

    for owner in candidates:
        plate = owner["plateNumber"]

        if plate_counts[plate] > 1:
            skipped["DuplicatePlate"] += 1
            continue

        owners.append(owner)

    return owners, skipped


def print_summary(rows, owners, skipped):
    print("\nVehicle linking validation")
    print("--------------------------")
    print("CSV rows:", len(rows))
    print("Eligible vehicles:", len(owners))

    for reason, count in sorted(
        skipped.items()
    ):
        print(f"Skipped {reason}: {count}")


def apply_import(owners, batch_size):
    confirmation = input(
        "Confirm isolated development database "
        "by typing IMPORT-DEMO: "
    )

    if confirmation != "IMPORT-DEMO":
        raise SystemExit("Import cancelled.")

    client = CampusApiClient()

    if not client.device_key:
        client.device_key = getpass(
            "Enter development device API key: "
        )

    accounts_created = 0
    cars_added = 0
    rejected = 0

    try:
        for start in range(
            0, len(owners), batch_size
        ):
            batch = owners[
                start:start + batch_size
            ]

            result = client.device_post(
                "/api/dev/integration/car-owners",
                batch,
            )

            accounts_created += result.get(
                "accountsCreated", 0
            )

            cars_added += result.get(
                "carsAdded", 0
            )

            rejected += len(
                result.get("skipped", [])
            )

            print(
                "Batch completed:",
                start // batch_size + 1,
            )

    finally:
        print("\nCompleted batch results:")
        print(
            "Accounts created:",
            accounts_created,
        )
        print("Vehicles registered:", cars_added)
        print("Server-reported skips:", rejected)

        client.close()


def main():
    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--csv",
        default="ocr_review_results.csv",
    )

    parser.add_argument(
        "--batch-size",
        type=int,
        default=10,
    )

    parser.add_argument(
        "--limit",
        type=int,
        default=10,
    )

    parser.add_argument(
        "--apply",
        action="store_true",
        help="Explicitly enable database import.",
    )

    args = parser.parse_args()

    if not 1 <= args.batch_size <= MAX_BATCH_SIZE:
        parser.error(
            "Batch size must be between 1 and 500."
        )

    if args.limit < 1:
        parser.error(
            "Limit must be at least 1."
        )

    if not Path(args.csv).is_file():
        parser.error("CSV file does not exist.")

    rows = load_rows(args.csv)

    owners, skipped = prepare_owners(rows)

    print_summary(rows, owners, skipped)

    owners = owners[:args.limit]

    print("Selected for processing:", len(owners))

    if not owners:
        print("No eligible vehicles.")
        return

    if not args.apply:
        print("\nDRY RUN ONLY")
        print("No API requests were sent.")
        print("No database records were changed.")
        return

    apply_import(
        owners,
        args.batch_size,
    )


if __name__ == "__main__":
    main()
