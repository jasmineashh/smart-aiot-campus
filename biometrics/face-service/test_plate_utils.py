
import unittest

from plate_utils import (
    normalize_plate,
    is_valid_plate,
    format_display_plate,
)


LETTERS = "\u0633\u0628\u062c"
ARABIC_NUMBERS = "\u0661\u0662\u0663\u0664"
PERSIAN_NUMBERS = "\u06f1\u06f2\u06f3\u06f4"

EXPECTED = f"{LETTERS} 1234"


class PlateNormalizationTests(unittest.TestCase):

    def test_western_digits(self):
        self.assertEqual(
            normalize_plate(f"{LETTERS} 1234"),
            EXPECTED,
        )

    def test_arabic_digits(self):
        self.assertEqual(
            normalize_plate(
                f"{LETTERS} {ARABIC_NUMBERS}"
            ),
            EXPECTED,
        )

    def test_persian_digits(self):
        self.assertEqual(
            normalize_plate(
                f"{LETTERS} {PERSIAN_NUMBERS}"
            ),
            EXPECTED,
        )

    def test_spaced_letters(self):
        self.assertEqual(
            normalize_plate(
                f"{' '.join(LETTERS)} 1234"
            ),
            EXPECTED,
        )

    def test_reversed_groups(self):
        self.assertEqual(
            normalize_plate(f"1234 {LETTERS}"),
            EXPECTED,
        )

    def test_two_letters_three_digits(self):
        self.assertTrue(
            is_valid_plate(
                "\u0633\u0628 123"
            )
        )

    def test_empty_plate(self):
        self.assertFalse(is_valid_plate(""))

    def test_latin_letters(self):
        self.assertFalse(
            is_valid_plate("ABC 1234")
        )

    def test_placeholder_plate(self):
        self.assertFalse(
            is_valid_plate("UNREAD-0001")
        )

    def test_invalid_digit_count(self):
        self.assertFalse(
            is_valid_plate(
                f"{LETTERS} 12345"
            )
        )

    def test_invalid_letter_count(self):
        self.assertFalse(
            is_valid_plate(
                "\u0633 1234"
            )
        )

    def test_display_format(self):
        self.assertEqual(
            format_display_plate(EXPECTED),
            f"{' '.join(LETTERS)} {ARABIC_NUMBERS}",
        )


if __name__ == "__main__":
    unittest.main(verbosity=2)
