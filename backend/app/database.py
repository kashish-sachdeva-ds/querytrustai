from typing import Generator, AsyncGenerator
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.config import get_settings

settings = get_settings()

# Primary database engine (used by migrations and app services with full app_user rights)
engine = create_engine(
    settings.sqlalchemy_database_url,
    pool_pre_ping=True,
    pool_recycle=1800,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Read-only database engine (strictly bound to analytics_reader role or fallback to primary DB)
readonly_engine = create_engine(
    settings.sqlalchemy_readonly_database_url,
    pool_pre_ping=True,
    pool_recycle=1800,
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


import logging
logger = logging.getLogger("querytrust.database")

# Asynchronous SQLAlchemy 2.0 engines & sessionmakers (graceful fallback if async driver is not installed)
try:
    async_engine = create_async_engine(
        settings.async_sqlalchemy_database_url,
        pool_pre_ping=True,
        pool_recycle=1800,
        pool_size=10,
        max_overflow=20,
    )
    AsyncSessionLocal = async_sessionmaker(
        bind=async_engine,
        class_=AsyncSession,
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
    )
except Exception as exc:
    logger.warning(f"Async primary database engine deferred or driver not installed: {exc}")
    async_engine = None
    AsyncSessionLocal = None

try:
    async_readonly_engine = create_async_engine(
        settings.async_sqlalchemy_readonly_database_url,
        pool_pre_ping=True,
        pool_recycle=1800,
        pool_size=10,
        max_overflow=20,
    )
    AsyncReadonlySessionLocal = async_sessionmaker(
        bind=async_readonly_engine,
        class_=AsyncSession,
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
    )
except Exception as exc:
    logger.warning(f"Async read-only database engine deferred or driver not installed: {exc}")
    async_readonly_engine = None
    AsyncReadonlySessionLocal = None


async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """Asynchronous dependency for app_user privileges."""
    if AsyncSessionLocal is None:
        raise RuntimeError("Async database session is unavailable: async driver is not installed or configured.")
    async with AsyncSessionLocal() as session:
        yield session


async def get_async_readonly_db() -> AsyncGenerator[AsyncSession, None]:
    """Asynchronous dependency for analytics_reader SELECT-only privileges with statement timeout."""
    if AsyncReadonlySessionLocal is None:
        raise RuntimeError("Async read-only database session is unavailable: async driver is not installed or configured.")
    async with AsyncReadonlySessionLocal() as session:
        # Enforce 5,000ms statement timeout
        try:
            await session.execute(text("SET statement_timeout = '5000ms'"))
        except Exception:
            pass
        yield session

