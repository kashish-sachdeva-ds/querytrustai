from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.config import get_settings

settings = get_settings()

# Primary database engine (used by migrations and app services with full app_user rights)
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Read-only database engine (strictly bound to analytics_reader role)
readonly_engine = create_engine(
    settings.READONLY_DATABASE_URL,
    pool_pre_ping=True,
    execution_options={"isolation_level": "AUTOCOMMIT"},
)

ReadonlySessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=readonly_engine)

Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """Dependency that yields a session connected with app_user privileges."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_readonly_db() -> Generator[Session, None, None]:
    """Dependency that yields a session connected with analytics_reader SELECT-only privileges."""
    db = ReadonlySessionLocal()
    try:
        yield db
    finally:
        db.close()
