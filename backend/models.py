"""Database schema: four tables.

    forms 1 ──── N questions
    forms 1 ──── N responses          (one response = one person submitting the form)
    responses 1 ── N answers N ── 1 questions   (one answer = one question in one response)
"""

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    UniqueConstraint,
)
from sqlalchemy.orm import relationship

from database import Base


def new_form_id():
    """Short random id. It appears in the public link (/to/<id>), so it must not be guessable."""
    return uuid.uuid4().hex[:8]


def new_question_id():
    return str(uuid.uuid4())


def utc_now():
    """Current time in UTC. SQLite has no timezone type, so we store it without one."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


class Form(Base):
    __tablename__ = "forms"

    id = Column(String, primary_key=True, default=new_form_id)
    title = Column(String, nullable=False)
    is_published = Column(Boolean, nullable=False, default=False)
    theme = Column(String, nullable=False, default="default")
    thank_you_message = Column(
        String, nullable=False, default="Thanks for completing this typeform."
    )
    # How many people began answering. completion rate = responses / starts.
    starts = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=utc_now)
    updated_at = Column(DateTime, nullable=False, default=utc_now)

    # cascade: deleting a form deletes its questions and responses too.
    # delete-orphan: a question removed from this list is deleted from the table.
    questions = relationship(
        "Question", order_by="Question.position", cascade="all, delete-orphan"
    )
    responses = relationship("Response", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"

    # A UUID made in the browser, so the builder can show a new question
    # instantly without waiting for the server to hand out an id.
    id = Column(String, primary_key=True, default=new_question_id)
    form_id = Column(
        String, ForeignKey("forms.id", ondelete="CASCADE"), nullable=False, index=True
    )
    position = Column(Integer, nullable=False)  # order inside the form: 0, 1, 2...
    type = Column(String, nullable=False)  # short_text, email, rating...
    title = Column(String, nullable=False, default="")
    description = Column(String, nullable=False, default="")
    required = Column(Boolean, nullable=False, default=False)
    # Choices for multiple_choice and dropdown questions, e.g. ["Red", "Blue"].
    options = Column(JSON, nullable=False, default=list)

    answers = relationship("Answer", cascade="all, delete-orphan")


class Response(Base):
    __tablename__ = "responses"

    id = Column(Integer, primary_key=True)
    form_id = Column(
        String, ForeignKey("forms.id", ondelete="CASCADE"), nullable=False, index=True
    )
    submitted_at = Column(DateTime, nullable=False, default=utc_now)

    # lazy="selectin": when we list many responses, their answers are loaded
    # in one extra query instead of one query per response.
    answers = relationship("Answer", cascade="all, delete-orphan", lazy="selectin")


class Answer(Base):
    __tablename__ = "answers"
    # A response can answer each question only once.
    __table_args__ = (UniqueConstraint("response_id", "question_id"),)

    id = Column(Integer, primary_key=True)
    response_id = Column(
        Integer, ForeignKey("responses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    question_id = Column(
        String, ForeignKey("questions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    # Every answer is stored as text: "Asha", "42", "Yes", "4" (a rating), a chosen option.
    value = Column(String, nullable=False)
