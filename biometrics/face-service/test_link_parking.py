
import unittest

from link_parking import prepare_owners


PLATE = "\u0633\u0628\u062c 1234"


def make_row(**changes):
    row = {
        "UniversityId": "DEMO-001",
        "FullName": "Synthetic Demo Person",
        "Department": "Engineering",
        "Role": "Student",
        "Transport": "Car",
        "PlateNumber": PLATE,
        "PlateStatus": "Verified",
    }

    row.update(changes)
    return row


class VehicleLinkingTests(unittest.TestCase):

    def test_valid_student(self):
        owners, skipped = prepare_owners(
            [make_row()]
        )

        self.assertEqual(len(owners), 1)
        self.assertEqual(
            owners[0]["role"], "Student"
        )

    def test_professor_role(self):
        owners, _ = prepare_owners([
            make_row(Role="Professor")
        ])

        self.assertEqual(
            owners[0]["role"], "Professor"
        )

    def test_worker_role(self):
        owners, _ = prepare_owners([
            make_row(Role="Worker")
        ])

        self.assertEqual(
            owners[0]["role"], "Staff"
        )

    def test_visitor_rejected(self):
        owners, skipped = prepare_owners([
            make_row(Role="Visitor")
        ])

        self.assertEqual(len(owners), 0)
        self.assertEqual(
            skipped["UnsupportedRole"], 1
        )

    def test_admin_rejected(self):
        owners, skipped = prepare_owners([
            make_row(Role="Admin")
        ])

        self.assertEqual(len(owners), 0)
        self.assertEqual(
            skipped["UnsupportedRole"], 1
        )

    def test_unknown_role_rejected(self):
        owners, skipped = prepare_owners([
            make_row(Role="Unknown")
        ])

        self.assertEqual(len(owners), 0)
        self.assertEqual(
            skipped["UnsupportedRole"], 1
        )

    def test_unverified_plate(self):
        owners, skipped = prepare_owners([
            make_row(PlateStatus="Candidate")
        ])

        self.assertEqual(len(owners), 0)
        self.assertEqual(
            skipped["PlateNotVerified"], 1
        )

    def test_fake_plate_rejected(self):
        owners, skipped = prepare_owners([
            make_row(PlateNumber="UNREAD-001")
        ])

        self.assertEqual(len(owners), 0)
        self.assertEqual(
            skipped["InvalidPlate"], 1
        )

    def test_duplicate_plates(self):
        owners, skipped = prepare_owners([
            make_row(),
            make_row(UniversityId="DEMO-002"),
        ])

        self.assertEqual(len(owners), 0)
        self.assertEqual(
            skipped["DuplicatePlate"], 2
        )

    def test_non_car_owner(self):
        owners, skipped = prepare_owners([
            make_row(Transport="Bus")
        ])

        self.assertEqual(len(owners), 0)
        self.assertEqual(
            skipped["NotCarOwner"], 1
        )

    def test_missing_owner_information(self):
        owners, skipped = prepare_owners([
            make_row(UniversityId="")
        ])

        self.assertEqual(len(owners), 0)
        self.assertEqual(
            skipped["MissingOwnerInformation"], 1
        )

    def test_arabic_digit_normalization(self):
        owners, _ = prepare_owners([
            make_row(
                PlateNumber=(
                    "\u0633\u0628\u062c "
                    "\u0661\u0662\u0663\u0664"
                )
            )
        ])

        self.assertEqual(
            owners[0]["plateNumber"],
            PLATE,
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
