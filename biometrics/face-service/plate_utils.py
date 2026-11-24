
import re
import unicodedata


DIGIT_MAP = str.maketrans(
    "\u0660\u0661\u0662\u0663\u0664"
    "\u0665\u0666\u0667\u0668\u0669"
    "\u06f0\u06f1\u06f2\u06f3\u06f4"
    "\u06f5\u06f6\u06f7\u06f8\u06f9",
    "01234567890123456789",
)

ARABIC_DIGIT_MAP = str.maketrans(
    "0123456789",
    "\u0660\u0661\u0662\u0663\u0664"
    "\u0665\u0666\u0667\u0668\u0669",
)

LETTER_MAP = str.maketrans({
    "\u0623": "\u0627",
    "\u0625": "\u0627",
    "\u0622": "\u0627",
    "\u0649": "\u064a",
    "\u0640": "",
})

ARABIC_LETTER = re.compile(
    r"[\u0621-\u063a\u0641-\u064a]"
)


def normalize_digits(value):
    return value.translate(DIGIT_MAP)


def normalize_letters(value):
    value = unicodedata.normalize("NFKC", value)
    value = value.translate(LETTER_MAP)

    return "".join(
        ch for ch in value
        if not ch.isspace()
    )


def normalize_plate(value):
    if not value:
        return ""

    value = unicodedata.normalize("NFKC", value)
    value = normalize_digits(value)
    value = value.translate(LETTER_MAP)

    value = "".join(
        ch for ch in value
        if not ch.isspace() and ch != "|"
    )

    match = re.fullmatch(
        r"([\u0621-\u063a\u0641-\u064a]{2,3})"
        r"([0-9]{3,4})",
        value,
    )

    if not match:
        match = re.fullmatch(
            r"([0-9]{3,4})"
            r"([\u0621-\u063a\u0641-\u064a]{2,3})",
            value,
        )

        if not match:
            return ""

        digits, letters = match.groups()
    else:
        letters, digits = match.groups()

    return f"{letters} {digits}"


def is_valid_plate(value):
    return bool(normalize_plate(value))


def format_display_plate(value):
    normalized = normalize_plate(value)

    if not normalized:
        return ""

    letters, digits = normalized.split(" ")

    display_letters = " ".join(letters)
    display_digits = digits.translate(
        ARABIC_DIGIT_MAP
    )

    return f"{display_letters} {display_digits}"
