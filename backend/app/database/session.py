"""Database engine, session management, and base model."""

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from app.core.config import settings


def _get_engine():
    """Create the appropriate engine based on DATABASE_URL."""
    url = settings.database_url
    if settings.is_sqlite:
        engine = create_engine(
            url,
            connect_args={"check_same_thread": False},
            echo=False,
        )
        # Enable WAL mode and foreign keys for SQLite
        @event.listens_for(engine, "connect")
        def set_sqlite_pragma(dbapi_connection, connection_record):
            cursor = dbapi_connection.cursor()
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()
    else:
        engine = create_engine(
            url,
            pool_size=10,
            max_overflow=20,
            pool_pre_ping=True,
            echo=False,
        )
    return engine


engine = _get_engine()
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    """Declarative base class for all ORM models."""
    pass


def get_db():
    """Dependency that provides a database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables defined by ORM models."""
    import app.database.models  # noqa: F401
    Base.metadata.create_all(bind=engine)

    # If SQLite, run migration helper to ensure existing tables have workspace_id column
    if settings.is_sqlite:
        try:
            from app.database.migrate import migrate_database
            db_path = settings.database_url.replace("sqlite:///", "")
            migrate_database(db_path)
        except Exception as e:
            import logging
            logging.getLogger(__name__).warning("Migration check note: %s", e)
