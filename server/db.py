# server/db.py
import os
from pathlib import Path
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

# Default: local SQLite file relative to this server package, not the shell cwd.
DEFAULT_SQLITE_PATH = Path(__file__).resolve().with_name("myshortbiz.db")
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DEFAULT_SQLITE_PATH}")

# Special connect args only needed for SQLite
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    DATABASE_URL,
    echo=False,          # set True if you want to see SQL in logs
    future=True,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    future=True,
)

Base = declarative_base()


def _ensure_sqlite_users_schema() -> None:
    if not DATABASE_URL.startswith("sqlite"):
        return

    with engine.begin() as conn:
        table_exists = conn.execute(
            text("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        ).first()
        if not table_exists:
            return

        existing_columns = {
            row[1]
            for row in conn.execute(text("PRAGMA table_info(users)")).fetchall()
        }

        column_patches = {
            "full_name": "ALTER TABLE users ADD COLUMN full_name VARCHAR",
            "tokens_remaining": "ALTER TABLE users ADD COLUMN tokens_remaining INTEGER NOT NULL DEFAULT 0",
            "created_at": "ALTER TABLE users ADD COLUMN created_at DATETIME",
        }

        for column_name, statement in column_patches.items():
            if column_name not in existing_columns:
                conn.execute(text(statement))


_ensure_sqlite_users_schema()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
