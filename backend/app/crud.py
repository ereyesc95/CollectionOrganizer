from __future__ import annotations

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.animations import animation_url_for, find_animation_path, get_animations_folder
from app.autographs import autograph_url_for, find_autograph_path
from app.covers import cover_url_for, find_cover_path, get_covers_folder
from app.models import (
    Record,
    RecordAnimationTag,
    RecordAutographTag,
    RecordCanvasTag,
    RecordMediaTag,
)
from app.parse_album import parse_album
from app.schemas import FacetOption, FacetsOut, RecordCreate, RecordOut, RecordUpdate


def _set_tags(db: Session, record: Record, model, attr: str, tags: list[str]) -> None:
    coll = getattr(record, attr)
    coll.clear()
    db.flush()
    seen: set[str] = set()
    for tag in tags:
        t = tag.strip()
        if not t or t in seen:
            continue
        seen.add(t)
        coll.append(model(record_id=record.id, tag=t))


def record_to_out(db: Session, record: Record) -> RecordOut:
    covers_folder = get_covers_folder(db)
    animations_folder = get_animations_folder(db)
    cover_path = find_cover_path(covers_folder, record.cover_key)
    animation_path = find_animation_path(animations_folder, record.cover_key)
    autograph_path, autograph_source = find_autograph_path(
        db, record.id, record.cover_key
    )
    return RecordOut(
        id=record.id,
        cover_key=record.cover_key,
        artist=record.artist,
        record_year=record.record_year,
        title=record.title,
        edition_year=record.edition_year,
        edition_title=record.edition_title,
        pending=record.pending,
        media_tags=sorted(t.tag for t in record.media_tags),
        animation_tags=sorted(t.tag for t in record.animation_tags),
        canvas_tags=sorted(t.tag for t in record.canvas_tags),
        autograph_tags=sorted(t.tag for t in record.autograph_tags),
        has_cover=cover_path is not None,
        cover_url=cover_url_for(record.id) if cover_path else None,
        has_autograph_photo=autograph_path is not None,
        autograph_photo_url=autograph_url_for(record.id) if autograph_path else None,
        autograph_photo_source=autograph_source,
        has_animation_file=animation_path is not None,
        animation_url=animation_url_for(record.id) if animation_path else None,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


def create_record(db: Session, data: RecordCreate) -> Record:
    parsed = parse_album(data.cover_key)
    record = Record(
        cover_key=data.cover_key.strip(),
        artist=data.artist or parsed.artist,
        record_year=data.record_year if data.record_year is not None else parsed.record_year,
        title=data.title or parsed.title,
        edition_year=data.edition_year if data.edition_year is not None else parsed.edition_year,
        edition_title=data.edition_title or parsed.edition_title,
        pending=data.pending,
    )
    db.add(record)
    db.flush()
    _set_tags(db, record, RecordMediaTag, "media_tags", data.media_tags)
    _set_tags(db, record, RecordAnimationTag, "animation_tags", data.animation_tags)
    _set_tags(db, record, RecordCanvasTag, "canvas_tags", data.canvas_tags)
    _set_tags(db, record, RecordAutographTag, "autograph_tags", data.autograph_tags)
    db.commit()
    db.refresh(record)
    return record


def update_record(db: Session, record: Record, data: RecordUpdate) -> Record:
    for field in (
        "cover_key",
        "artist",
        "record_year",
        "title",
        "edition_year",
        "edition_title",
        "pending",
    ):
        val = getattr(data, field)
        if val is not None:
            setattr(record, field, val)
    if data.media_tags is not None:
        _set_tags(db, record, RecordMediaTag, "media_tags", data.media_tags)
    if data.animation_tags is not None:
        _set_tags(db, record, RecordAnimationTag, "animation_tags", data.animation_tags)
    if data.canvas_tags is not None:
        _set_tags(db, record, RecordCanvasTag, "canvas_tags", data.canvas_tags)
    if data.autograph_tags is not None:
        _set_tags(db, record, RecordAutographTag, "autograph_tags", data.autograph_tags)
    db.commit()
    db.refresh(record)
    return record


def delete_record(db: Session, record: Record) -> None:
    db.delete(record)
    db.commit()


def _tag_subquery(model, tags: list[str]):
    if not tags:
        return None
    return (
        select(model.record_id)
        .where(model.tag.in_(tags))
        .group_by(model.record_id)
        .having(func.count(func.distinct(model.tag)) == len(tags))
    )


def list_records(
    db: Session,
    *,
    search: str = "",
    media: list[str] | None = None,
    animation: list[str] | None = None,
    canvas: list[str] | None = None,
    autograph: list[str] | None = None,
    has_autograph: bool | None = None,
    pending: list[str] | None = None,
    has_pending: bool | None = None,
    has_animation: bool | None = None,
    has_canvas: bool | None = None,
    has_cover: bool | None = None,
    sort: str = "artist",
    order: str = "asc",
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[Record], int]:
    q = select(Record).options(
        selectinload(Record.media_tags),
        selectinload(Record.animation_tags),
        selectinload(Record.canvas_tags),
        selectinload(Record.autograph_tags),
    )

    if search.strip():
        term = f"%{search.strip()}%"
        q = q.where(
            or_(
                Record.artist.ilike(term),
                Record.title.ilike(term),
                Record.cover_key.ilike(term),
            )
        )

    if media:
        q = q.where(Record.id.in_(select(RecordMediaTag.record_id).where(RecordMediaTag.tag.in_(media))))

    if animation:
        q = q.where(
            Record.id.in_(
                select(RecordAnimationTag.record_id).where(
                    RecordAnimationTag.tag.in_(animation)
                )
            )
        )
    elif has_animation is True:
        q = q.where(Record.id.in_(select(RecordAnimationTag.record_id)))
    elif has_animation is False:
        q = q.where(~Record.id.in_(select(RecordAnimationTag.record_id)))

    if canvas:
        q = q.where(
            Record.id.in_(select(RecordCanvasTag.record_id).where(RecordCanvasTag.tag.in_(canvas)))
        )
    elif has_canvas is True:
        q = q.where(Record.id.in_(select(RecordCanvasTag.record_id)))
    elif has_canvas is False:
        q = q.where(~Record.id.in_(select(RecordCanvasTag.record_id)))

    if autograph:
        q = q.where(
            Record.id.in_(
                select(RecordAutographTag.record_id).where(
                    RecordAutographTag.tag.in_(autograph)
                )
            )
        )
    elif has_autograph is True:
        q = q.where(Record.id.in_(select(RecordAutographTag.record_id)))
    elif has_autograph is False:
        q = q.where(~Record.id.in_(select(RecordAutographTag.record_id)))

    if pending:
        q = q.where(Record.pending.in_(pending))
    elif has_pending is True:
        q = q.where(Record.pending.isnot(None), Record.pending != "")
    elif has_pending is False:
        q = q.where(or_(Record.pending.is_(None), Record.pending == ""))

    records_all = db.scalars(q).unique().all()

    if has_cover is not None:
        folder = get_covers_folder(db)
        filtered = []
        for r in records_all:
            found = find_cover_path(folder, r.cover_key) is not None
            if found == has_cover:
                filtered.append(r)
        records_all = filtered

    def field_key(field: str, r: Record):
        if field == "artist":
            return r.artist.lower()
        if field == "year":
            return r.record_year or 0
        if field == "title":
            return r.title.lower()
        if field == "edition":
            return (r.edition_year or 0, (r.edition_title or "").lower())
        if field == "media":
            return ",".join(sorted(t.tag for t in r.media_tags)).lower()
        return r.cover_key.lower()

    sort_fields = [s.strip() for s in sort.split(",") if s.strip()] or ["artist"]
    order_parts = [o.strip() for o in order.split(",")]
    while len(order_parts) < len(sort_fields):
        order_parts.append(order_parts[-1] if order_parts else "asc")

    # Stable multi-key sort: apply from last field to first
    for i in range(len(sort_fields) - 1, -1, -1):
        field = sort_fields[i]
        rev = order_parts[i].lower() == "desc"

        def single_key(r: Record, f=field):
            v = field_key(f, r)
            return v if isinstance(v, tuple) else (v,)

        records_all = sorted(records_all, key=single_key, reverse=rev)

    total = len(records_all)
    start = (page - 1) * page_size
    page_items = records_all[start : start + page_size]
    return page_items, total


def get_facets(db: Session) -> FacetsOut:
    def facet_rows(model) -> list[FacetOption]:
        rows = db.execute(
            select(model.tag, func.count(func.distinct(model.record_id)))
            .group_by(model.tag)
            .order_by(func.count(func.distinct(model.record_id)).desc())
        ).all()
        return [FacetOption(value=r[0], count=r[1]) for r in rows]

    pending_rows = db.execute(
        select(Record.pending, func.count(Record.id))
        .where(Record.pending.isnot(None), Record.pending != "")
        .group_by(Record.pending)
    ).all()

    return FacetsOut(
        media=facet_rows(RecordMediaTag),
        animation=facet_rows(RecordAnimationTag),
        canvas=facet_rows(RecordCanvasTag),
        autograph=facet_rows(RecordAutographTag),
        pending=[FacetOption(value=r[0], count=r[1]) for r in pending_rows],
    )
