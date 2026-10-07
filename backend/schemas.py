"""Shapes of the JSON that goes in and out of the API. Pydantic validates them."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

QuestionType = Literal[
    "short_text",
    "long_text",
    "multiple_choice",
    "dropdown",
    "email",
    "number",
    "yes_no",
    "rating",
]


class Question(BaseModel):
    """Used both when the builder saves a form and when a form is sent back."""

    # from_attributes lets Pydantic read the values straight off a database row.
    model_config = ConfigDict(from_attributes=True)

    id: str
    type: QuestionType
    title: str = ""
    description: str = ""
    required: bool = False
    options: list[str] = []


# ---------- Forms ----------


class FormCreate(BaseModel):
    title: str


class FormUpdate(BaseModel):
    """PATCH body. Only the fields that are sent get changed."""

    title: str | None = None
    is_published: bool | None = None


class FormSave(BaseModel):
    """PUT body. The builder sends the whole form each time it autosaves."""

    title: str
    theme: str
    thank_you_message: str
    questions: list[Question]


class Form(BaseModel):
    """A full form with its questions in order."""

    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    is_published: bool
    theme: str
    thank_you_message: str
    questions: list[Question]


class FormSummary(BaseModel):
    """One row in the dashboard list."""

    id: str
    title: str
    is_published: bool
    theme: str
    updated_at: datetime
    response_count: int
    completion_rate: int  # percent


# ---------- Responses ----------


class ResponseCreate(BaseModel):
    answers: dict[str, str]  # question id -> what the person answered


class Response(BaseModel):
    id: int
    submitted_at: datetime
    answers: dict[str, str]  # question id -> answer


class QuestionStats(BaseModel):
    question_id: str
    answered: int  # how many responses answered this question
    counts: dict[str, int]  # answer -> times chosen (choice, yes/no and rating questions)
    average: float | None  # rating and number questions


class FormStats(BaseModel):
    starts: int
    responses: int
    completion_rate: int  # percent
    questions: list[QuestionStats]
