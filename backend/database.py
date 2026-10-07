"""Database connection: one SQLite file, one session per request."""

import os
from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base, sessionmaker

# The whole database is a single file next to this code.
# DATABASE_PATH lets a hosting provider point it at a persistent disk instead.
DATABASE_PATH = os.getenv("DATABASE_PATH", str(Path(__file__).parent / "typeform.db"))

# check_same_thread=False: FastAPI handles requests on several threads, and by
# default SQLite only lets the thread that opened a connection use it.
engine = create_engine(
    f"sqlite:///{DATABASE_PATH}",
    connect_args={"check_same_thread": False},
)


@event.listens_for(engine, "connect")
def enable_foreign_keys(connection, _record):
    """SQLite ignores foreign keys unless this is switched on for every connection."""
    connection.execute("PRAGMA foreign_keys = ON")


SessionLocal = sessionmaker(bind=engine)

# Every table class in models.py inherits from Base.
Base = declarative_base()


def get_db():
    """FastAPI dependency: give the request a session and always close it afterwards."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
