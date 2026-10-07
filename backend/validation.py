"""Server-side validation of a single answer.

The browser checks the same rules (frontend/lib/forms.ts) to give instant feedback,
but it can be bypassed, so the server always checks again before saving.
"""

import re

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")  # something@something.something
NUMBER_PATTERN = re.compile(r"^-?\d+(\.\d+)?$")  # 7, -3, 4.5


def is_number(value: str) -> bool:
    return NUMBER_PATTERN.match(value) is not None


def validate_answer(question, value: str) -> str | None:
    """Return an error message for this answer, or None if it is fine."""
    value = value.strip()

    if value == "":
        return "Please fill this in" if question.required else None

    if question.type == "email" and not EMAIL_PATTERN.match(value):
        return "Hmm... that email doesn't look right"
    if question.type == "number" and not is_number(value):
        return "Numbers only please"
    if question.type in ("multiple_choice", "dropdown") and value not in question.options:
        return "Please pick one of the options"
    if question.type == "yes_no" and value not in ("Yes", "No"):
        return "Please answer Yes or No"
    if question.type == "rating" and value not in ("1", "2", "3", "4", "5"):
        return "Please pick a rating from 1 to 5"

    return None
