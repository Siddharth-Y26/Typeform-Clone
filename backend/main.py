"""Typeform clone API.

Run with:  uvicorn main:app --reload
Docs at:   http://localhost:8000/docs
"""

import csv
import io

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

import models
import schemas
from database import Base, engine, get_db
from seed import seed_database
from validation import is_number, validate_answer

Base.metadata.create_all(engine)  # create the tables if they do not exist yet
seed_database()  # adds the sample forms, only when the database is empty

app = FastAPI(title="Typeform Clone API")

# The frontend runs on a different origin (port 3000 / Vercel), so the browser
# needs CORS headers. The API uses no cookies, so allowing every origin is safe here.
app.add_middleware(
    CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"]
)


# ---------- Helpers ----------


def get_form_or_404(db: Session, form_id: str) -> models.Form:
    form = db.get(models.Form, form_id)
    if form is None:
        raise HTTPException(status_code=404, detail="Form not found")
    return form


def get_published_form_or_404(db: Session, form_id: str) -> models.Form:
    """Respondents can only reach published forms. A draft looks like it does not exist."""
    form = db.get(models.Form, form_id)
    if form is None or not form.is_published:
        raise HTTPException(status_code=404, detail="This form is not available")
    return form


def get_responses(db: Session, form_id: str) -> list[models.Response]:
    """All responses of a form, newest first."""
    return (
        db.query(models.Response)
        .filter(models.Response.form_id == form_id)
        .order_by(models.Response.submitted_at.desc())
        .all()
    )


def completion_rate(responses: int, starts: int) -> int:
    """Percentage of people who started the form and also submitted it."""
    if starts == 0:
        return 0
    return min(100, round(100 * responses / starts))


# ---------- Forms (creator side) ----------


@app.get("/api/forms", response_model=list[schemas.FormSummary])
def list_forms(db: Session = Depends(get_db)):
    """Dashboard list. One query: LEFT JOIN so forms with no responses still appear."""
    rows = (
        db.query(models.Form, func.count(models.Response.id))
        .outerjoin(models.Response)
        .group_by(models.Form.id)
        .order_by(models.Form.updated_at.desc())
        .all()
    )
    return [
        schemas.FormSummary(
            id=form.id,
            title=form.title,
            is_published=form.is_published,
            theme=form.theme,
            updated_at=form.updated_at,
            response_count=response_count,
            completion_rate=completion_rate(response_count, form.starts),
        )
        for form, response_count in rows
    ]


@app.post("/api/forms", response_model=schemas.Form, status_code=201)
def create_form(body: schemas.FormCreate, db: Session = Depends(get_db)):
    form = models.Form(title=body.title.strip() or "My typeform")
    db.add(form)
    db.commit()
    db.refresh(form)
    return form


@app.get("/api/forms/{form_id}", response_model=schemas.Form)
def get_form(form_id: str, db: Session = Depends(get_db)):
    return get_form_or_404(db, form_id)


@app.put("/api/forms/{form_id}", response_model=schemas.Form)
def save_form(form_id: str, body: schemas.FormSave, db: Session = Depends(get_db)):
    """The builder autosaves by sending the whole form. Questions arrive in display order."""
    form = get_form_or_404(db, form_id)
    form.title = body.title.strip() or "My typeform"
    form.theme = body.theme
    form.thank_you_message = body.thank_you_message
    form.updated_at = models.utc_now()

    existing = {question.id: question for question in form.questions}
    saved = []
    for position, incoming in enumerate(body.questions):
        # Reuse the row of a question we already have, so its answers stay attached.
        question = existing.get(incoming.id) or models.Question(id=incoming.id)
        question.position = position
        question.type = incoming.type
        question.title = incoming.title
        question.description = incoming.description
        question.required = incoming.required
        question.options = incoming.options
        saved.append(question)

    # Questions that are no longer in the list get deleted (delete-orphan in models.py).
    form.questions = saved
    db.commit()
    db.refresh(form)
    return form


@app.patch("/api/forms/{form_id}", response_model=schemas.Form)
def update_form(form_id: str, body: schemas.FormUpdate, db: Session = Depends(get_db)):
    """Rename a form and/or publish / unpublish it."""
    form = get_form_or_404(db, form_id)

    if body.title is not None:
        form.title = body.title.strip() or form.title
    if body.is_published is not None:
        if body.is_published and len(form.questions) == 0:
            raise HTTPException(status_code=400, detail="Add a question before publishing")
        form.is_published = body.is_published

    form.updated_at = models.utc_now()
    db.commit()
    db.refresh(form)
    return form


@app.delete("/api/forms/{form_id}", status_code=204)
def delete_form(form_id: str, db: Session = Depends(get_db)):
    """Deletes the form with its questions, responses and answers (cascade)."""
    db.delete(get_form_or_404(db, form_id))
    db.commit()


@app.post("/api/forms/{form_id}/duplicate", response_model=schemas.Form, status_code=201)
def duplicate_form(form_id: str, db: Session = Depends(get_db)):
    """Copy a form and its questions, but not its responses. The copy starts as a draft."""
    original = get_form_or_404(db, form_id)
    copy = models.Form(
        title=f"{original.title} (copy)",
        theme=original.theme,
        thank_you_message=original.thank_you_message,
    )
    for question in original.questions:
        copy.questions.append(
            models.Question(
                position=question.position,
                type=question.type,
                title=question.title,
                description=question.description,
                required=question.required,
                options=list(question.options),
            )
        )
    db.add(copy)
    db.commit()
    db.refresh(copy)
    return copy


# ---------- Public form (respondent side, no login) ----------


@app.get("/api/public/forms/{form_id}", response_model=schemas.Form)
def get_public_form(form_id: str, db: Session = Depends(get_db)):
    return get_published_form_or_404(db, form_id)


@app.post("/api/public/forms/{form_id}/start", status_code=204)
def start_form(form_id: str, db: Session = Depends(get_db)):
    """Called once when a respondent gives their first answer. Used for the completion rate."""
    form = get_published_form_or_404(db, form_id)
    form.starts = models.Form.starts + 1  # the database does the +1, so no count is lost
    db.commit()


@app.post("/api/public/forms/{form_id}/responses", status_code=201)
def submit_response(
    form_id: str, body: schemas.ResponseCreate, db: Session = Depends(get_db)
):
    form = get_published_form_or_404(db, form_id)

    # Check every question of the form, so a skipped required question is caught too.
    errors = {}
    for question in form.questions:
        error = validate_answer(question, body.answers.get(question.id, ""))
        if error:
            errors[question.id] = error
    if errors:
        raise HTTPException(status_code=422, detail=errors)  # {question id: message}

    response = models.Response(form_id=form.id)
    for question in form.questions:
        value = body.answers.get(question.id, "").strip()
        if value:  # unanswered optional questions are simply not stored
            response.answers.append(models.Answer(question_id=question.id, value=value))
    db.add(response)
    db.commit()
    return {"id": response.id}


# ---------- Results ----------


@app.get("/api/forms/{form_id}/responses", response_model=list[schemas.Response])
def list_responses(form_id: str, db: Session = Depends(get_db)):
    get_form_or_404(db, form_id)
    return [
        schemas.Response(
            id=response.id,
            submitted_at=response.submitted_at,
            answers={answer.question_id: answer.value for answer in response.answers},
        )
        for response in get_responses(db, form_id)
    ]


@app.get("/api/forms/{form_id}/stats", response_model=schemas.FormStats)
def get_stats(form_id: str, db: Session = Depends(get_db)):
    """Summary numbers for the form and for each of its questions."""
    form = get_form_or_404(db, form_id)
    total = db.query(models.Response).filter(models.Response.form_id == form_id).count()

    # One GROUP BY query tells us how many times each value was given to each question.
    rows = (
        db.query(models.Answer.question_id, models.Answer.value, func.count())
        .join(models.Question)
        .filter(models.Question.form_id == form_id)
        .group_by(models.Answer.question_id, models.Answer.value)
        .all()
    )
    counts = {question.id: {} for question in form.questions}
    for question_id, value, count in rows:
        counts[question_id][value] = count

    questions = []
    for question in form.questions:
        value_counts = counts[question.id]

        average = None
        if question.type in ("rating", "number"):
            total_sum = 0.0
            how_many = 0
            for value, count in value_counts.items():
                if is_number(value):
                    total_sum += float(value) * count
                    how_many += count
            if how_many > 0:
                average = round(total_sum / how_many, 1)

        # Per-value counts only make sense when there is a fixed set of answers.
        has_fixed_answers = question.type in ("multiple_choice", "dropdown", "yes_no", "rating")
        questions.append(
            schemas.QuestionStats(
                question_id=question.id,
                answered=sum(value_counts.values()),
                counts=value_counts if has_fixed_answers else {},
                average=average,
            )
        )

    return schemas.FormStats(
        starts=form.starts,
        responses=total,
        completion_rate=completion_rate(total, form.starts),
        questions=questions,
    )


@app.get("/api/forms/{form_id}/responses.csv")
def export_responses(form_id: str, db: Session = Depends(get_db)):
    """Download every response as a CSV file: one row per response, one column per question."""
    form = get_form_or_404(db, form_id)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Submitted at (UTC)"] + [question.title for question in form.questions])
    for response in get_responses(db, form_id):
        answers = {answer.question_id: answer.value for answer in response.answers}
        writer.writerow(
            [response.submitted_at.strftime("%Y-%m-%d %H:%M")]
            + [answers.get(question.id, "") for question in form.questions]
        )

    return PlainTextResponse(
        output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="responses-{form.id}.csv"'},
    )
