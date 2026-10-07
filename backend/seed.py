"""Sample data, so the app is usable right after setup.

Runs automatically when the server starts, but only if the database is empty.
"""

import random
from datetime import timedelta

import models
from database import SessionLocal

NAMES = [
    "Aarav Sharma", "Priya Nair", "Rohan Mehta", "Ananya Iyer", "Kabir Singh",
    "Meera Joshi", "Arjun Reddy", "Sneha Kapoor", "Vikram Rao", "Isha Verma",
    "Dev Malhotra", "Tara Menon", "Nikhil Jain", "Riya Desai", "Aditya Kulkarni",
    "Neha Gupta", "Sameer Khan", "Pooja Pillai", "Karan Bhatia", "Diya Chatterjee",
    "Rahul Saxena", "Aisha Thomas", "Manav Sethi", "Kavya Bose",
]

COMMENTS = [
    "Really smooth experience overall, keep it up!",
    "Support was quick to respond, which I appreciated.",
    "The onboarding could be a little shorter.",
    "Loved the design. It felt effortless to use.",
    "Pricing is a bit high for small teams.",
    "Would love to see a mobile app soon.",
    "Nothing to add, everything worked as expected.",
    "A few pages loaded slowly on my phone.",
]

FORMS = [
    {
        "title": "Customer Feedback Survey",
        "theme": "default",
        "is_published": True,
        "thank_you_message": "Thank you! Your feedback helps us get better.",
        "responses": 24,
        "questions": [
            {"type": "short_text", "title": "First off, what's your name?", "required": True},
            {
                "type": "email",
                "title": "What's the best email to reach you?",
                "description": "We'll only use it to follow up on your feedback.",
                "required": True,
            },
            {
                "type": "multiple_choice",
                "title": "How did you hear about us?",
                "required": True,
                "options": ["Friend or colleague", "Social media", "Search engine", "Advertisement"],
            },
            {
                "type": "rating",
                "title": "How would you rate your overall experience?",
                "required": True,
            },
            {"type": "yes_no", "title": "Would you recommend us to a friend?"},
            {
                "type": "long_text",
                "title": "Anything we could do better?",
                "description": "Be as honest as you like.",
            },
        ],
    },
    {
        "title": "Tech Meetup Registration",
        "theme": "midnight",
        "is_published": True,
        "thank_you_message": "You're in! See you at the meetup.",
        "responses": 15,
        "questions": [
            {"type": "short_text", "title": "What's your full name?", "required": True},
            {"type": "email", "title": "And your email address?", "required": True},
            {
                "type": "dropdown",
                "title": "Which city are you joining from?",
                "required": True,
                "options": ["Bengaluru", "Chennai", "Delhi", "Hyderabad", "Mumbai", "Pune"],
            },
            {
                "type": "multiple_choice",
                "title": "Which track are you most excited about?",
                "options": ["Web development", "AI and machine learning", "Cloud and DevOps", "Mobile"],
            },
            {
                "type": "number",
                "title": "How many guests are you bringing?",
                "description": "Enter 0 if you're coming alone.",
            },
            {"type": "yes_no", "title": "Do you need a vegetarian meal?", "required": True},
        ],
    },
    {
        "title": "Job Application",
        "theme": "default",
        "is_published": False,  # a draft, to show both statuses in the dashboard
        "thank_you_message": "Thanks for applying. We'll be in touch soon.",
        "responses": 0,
        "questions": [
            {"type": "short_text", "title": "What's your name?", "required": True},
            {"type": "email", "title": "Where can we email you?", "required": True},
            {"type": "number", "title": "How many years of experience do you have?"},
            {"type": "long_text", "title": "Why do you want to work with us?"},
        ],
    },
]


def sample_answer(question: models.Question, name: str) -> str:
    """Make up a believable answer for a question."""
    if question.type == "short_text":
        return name
    if question.type == "email":
        return name.lower().replace(" ", ".") + "@example.com"
    if question.type == "long_text":
        return random.choice(COMMENTS)
    if question.type == "number":
        return str(random.randint(0, 3))
    if question.type == "rating":
        return random.choice(["5", "5", "5", "4", "4", "4", "3", "2"])  # mostly happy
    if question.type == "yes_no":
        return random.choice(["Yes", "Yes", "No"])
    return random.choice(question.options)  # multiple_choice and dropdown


def seed_database():
    db = SessionLocal()
    if db.query(models.Form).count() > 0:
        db.close()
        return

    random.seed(7)  # fixed seed: the same sample data every time
    for data in FORMS:
        form = models.Form(
            title=data["title"],
            theme=data["theme"],
            is_published=data["is_published"],
            thank_you_message=data["thank_you_message"],
            starts=round(data["responses"] * 1.4),  # some people start but never finish
        )
        for position, question in enumerate(data["questions"]):
            form.questions.append(
                models.Question(id=models.new_question_id(), position=position, **question)
            )

        # Spread the sample responses over the last two weeks.
        for name in NAMES[: data["responses"]]:
            response = models.Response(
                submitted_at=models.utc_now() - timedelta(minutes=random.randint(30, 20000))
            )
            for question in form.questions:
                skipped = not question.required and random.random() < 0.25
                if not skipped:
                    response.answers.append(
                        models.Answer(
                            question_id=question.id, value=sample_answer(question, name)
                        )
                    )
            form.responses.append(response)

        db.add(form)

    db.commit()
    db.close()
