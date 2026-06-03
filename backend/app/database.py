from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from app.config import settings

engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    from app import models  # noqa: F401

    Base.metadata.create_all(bind=engine)
    _migrate_add_release_type()
    _migrate_legacy_pending()
    _migrate_everything_pending()


def _migrate_add_release_type() -> None:
    from sqlalchemy import inspect, text

    cols = {c["name"] for c in inspect(engine).get_columns("records")}
    if "release_type" in cols:
        return
    with engine.begin() as conn:
        conn.execute(text("ALTER TABLE records ADD COLUMN release_type VARCHAR(64)"))


def _migrate_legacy_pending() -> None:
    from sqlalchemy import inspect, select
    from sqlalchemy.orm import selectinload

    from app.models import Record, RecordPendingTag
    from app.pending_tags import DERIVED_TAGS, normalize_stored_pending

    if "record_pending_tags" not in inspect(engine).get_table_names():
        return

    db = SessionLocal()
    try:
        changed = False
        for record in db.scalars(
            select(Record).options(selectinload(Record.pending_tags))
        ).unique():
            if record.pending and not record.pending_tags:
                for tag in normalize_stored_pending([record.pending]):
                    record.pending_tags.append(
                        RecordPendingTag(record_id=record.id, tag=tag)
                    )
                    changed = True
                record.pending = None
                changed = True
            elif record.pending:
                record.pending = None
                changed = True
            for pt in list(record.pending_tags):
                if pt.tag in DERIVED_TAGS:
                    db.delete(pt)
                    changed = True
        if changed:
            db.commit()
    finally:
        db.close()


def _migrate_everything_pending() -> None:
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    from app.crud import _set_tags
    from app.models import Record, RecordPendingTag
    from app.pending_tags import EVERYTHING_TAG, STANDARD_PENDING_TAGS, normalize_stored_pending

    db = SessionLocal()
    try:
        changed = False
        for record in db.scalars(
            select(Record).options(selectinload(Record.pending_tags))
        ).unique():
            stored = [t.tag for t in record.pending_tags]
            if EVERYTHING_TAG not in stored and record.pending != EVERYTHING_TAG:
                continue
            new_tags = normalize_stored_pending(
                [t for t in stored if t != EVERYTHING_TAG] + list(STANDARD_PENDING_TAGS)
            )
            _set_tags(db, record, RecordPendingTag, "pending_tags", new_tags)
            if record.pending == EVERYTHING_TAG:
                record.pending = None
            changed = True
        if changed:
            db.commit()
    finally:
        db.close()
