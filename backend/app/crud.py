from __future__ import annotations

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.animations import (
    animation_files_for_tags,
    animation_url_for,
    find_animation_path,
    get_animations_folder,
)
from app.autographs import autograph_url_for, find_autograph_path
from app.canvas_files import canvas_files_for_tags, canvas_url_for, find_canvas_path
from app.covers import cover_url_for, find_cover_path, get_covers_folder
from app.record_assets import build_record_assets
from app.models import (
    Record,
    RecordAnimationTag,
    RecordAutographTag,
    RecordCanvasTag,
    RecordGenreTag,
    RecordCountryTag,
    RecordMediaTag,
    RecordPendingTag,
)
from app.pending_tags import (
    DERIVED_ANIMATION,
    DERIVED_CANVAS,
    build_pending_tags,
    normalize_stored_pending,
)
from app.parse_album import build_cover_key
from app.release_types import collection_unit_count, normalize_release_type
from app.schemas import FacetOption, FacetsOut, RecordCreate, RecordOut, RecordUpdate


def _record_load_options():
    return (
        selectinload(Record.media_tags),
        selectinload(Record.animation_tags),
        selectinload(Record.canvas_tags),
        selectinload(Record.autograph_tags),
        selectinload(Record.pending_tags),
        selectinload(Record.genre_tags),
        selectinload(Record.country_tags),
    )


def _reload_record(db: Session, record_id: int) -> Record:
    record = db.scalar(
        select(Record).where(Record.id == record_id).options(*_record_load_options())
    )
    if not record:
        raise ValueError(f"Record {record_id} not found after save")
    return record


def get_record(db: Session, record_id: int) -> Record | None:
    return db.scalar(
        select(Record).where(Record.id == record_id).options(*_record_load_options())
    )


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


def _normalize_country_tags(tags: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for tag in tags:
        t = tag.strip()
        if not t or t in seen:
            continue
        seen.add(t)
        out.append(t)
    return out


def _propagate_artist_country(
    db: Session,
    *,
    artist: str,
    country_tags: list[str],
    exclude_id: int,
) -> None:
    """Fill empty country on other albums by the same artist."""
    tags = _normalize_country_tags(country_tags)
    artist = artist.strip()
    if not tags or not artist:
        return

    has_country = select(RecordCountryTag.record_id).distinct()
    siblings = db.scalars(
        select(Record)
        .where(
            Record.artist == artist,
            Record.id != exclude_id,
            ~Record.id.in_(has_country),
        )
        .options(selectinload(Record.country_tags))
    ).unique().all()

    for sibling in siblings:
        _set_tags(db, sibling, RecordCountryTag, "country_tags", tags)


def record_to_out(db: Session, record: Record) -> RecordOut:
    covers_folder = get_covers_folder(db)
    animations_folder = get_animations_folder(db)
    cover_path = find_cover_path(covers_folder, record.cover_key)
    animation_path = find_animation_path(animations_folder, record.cover_key)
    canvas_path = find_canvas_path(db, record.cover_key)
    animation_tag_count = len(record.animation_tags)
    canvas_tag_count = len(record.canvas_tags)
    animation_files = animation_files_for_tags(
        animations_folder, record.cover_key, animation_tag_count
    )
    canvas_files = canvas_files_for_tags(db, record.cover_key, canvas_tag_count)
    autograph_path, autograph_source = find_autograph_path(
        db, record.id, record.cover_key
    )
    assets = build_record_assets(db, record)
    return RecordOut(
        id=record.id,
        cover_key=record.cover_key,
        artist=record.artist,
        record_year=record.record_year,
        title=record.title,
        edition_year=record.edition_year,
        edition_title=record.edition_title,
        pending_tags=build_pending_tags(record),
        media_tags=sorted(t.tag for t in record.media_tags),
        animation_tags=sorted(t.tag for t in record.animation_tags),
        canvas_tags=sorted(t.tag for t in record.canvas_tags),
        autograph_tags=sorted(t.tag for t in record.autograph_tags),
        release_type=record.release_type,
        genre_tags=sorted(t.tag for t in record.genre_tags),
        country_tags=sorted(t.tag for t in record.country_tags),
        has_cover=cover_path is not None,
        cover_url=cover_url_for(record.id) if cover_path else None,
        has_autograph_photo=autograph_path is not None,
        autograph_photo_url=autograph_url_for(record.id) if autograph_path else None,
        autograph_photo_source=autograph_source,
        has_animation_file=animation_path is not None,
        animation_url=animation_url_for(record.id) if animation_path else None,
        animation_files=animation_files,
        has_canvas_file=canvas_path is not None,
        canvas_url=canvas_url_for(record.id) if canvas_path else None,
        canvas_files=canvas_files,
        assets=assets,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


def create_record(db: Session, data: RecordCreate) -> Record:
    cover_key = build_cover_key(
        data.artist,
        data.record_year,
        data.title,
        data.edition_year,
        data.edition_title,
    )
    record = Record(
        cover_key=cover_key,
        artist=data.artist.strip(),
        record_year=data.record_year,
        title=data.title.strip(),
        edition_year=data.edition_year,
        edition_title=(data.edition_title or "").strip() or None,
        release_type=normalize_release_type(data.release_type),
    )
    db.add(record)
    db.flush()
    _set_tags(db, record, RecordMediaTag, "media_tags", data.media_tags)
    _set_tags(db, record, RecordAnimationTag, "animation_tags", data.animation_tags)
    _set_tags(db, record, RecordCanvasTag, "canvas_tags", data.canvas_tags)
    _set_tags(db, record, RecordAutographTag, "autograph_tags", data.autograph_tags)
    _set_tags(
        db,
        record,
        RecordPendingTag,
        "pending_tags",
        normalize_stored_pending(data.pending_tags),
    )
    _set_tags(db, record, RecordGenreTag, "genre_tags", data.genre_tags)
    _set_tags(db, record, RecordCountryTag, "country_tags", data.country_tags)
    _propagate_artist_country(
        db,
        artist=record.artist,
        country_tags=data.country_tags,
        exclude_id=record.id,
    )
    db.commit()
    return _reload_record(db, record.id)


def update_record(db: Session, record: Record, data: RecordUpdate) -> Record:
    for field in ("artist", "record_year", "title", "edition_year", "edition_title"):
        val = getattr(data, field)
        if val is not None:
            if isinstance(val, str):
                val = val.strip()
                if field == "edition_title" and not val:
                    val = None
            setattr(record, field, val)
    if data.release_type is not None:
        record.release_type = normalize_release_type(data.release_type) if data.release_type else None
    record.cover_key = build_cover_key(
        record.artist,
        record.record_year,
        record.title,
        record.edition_year,
        record.edition_title,
    )
    if data.pending_tags is not None:
        _set_tags(
            db,
            record,
            RecordPendingTag,
            "pending_tags",
            normalize_stored_pending(data.pending_tags),
        )
    if data.media_tags is not None:
        _set_tags(db, record, RecordMediaTag, "media_tags", data.media_tags)
    if data.animation_tags is not None:
        _set_tags(db, record, RecordAnimationTag, "animation_tags", data.animation_tags)
    if data.canvas_tags is not None:
        _set_tags(db, record, RecordCanvasTag, "canvas_tags", data.canvas_tags)
    if data.autograph_tags is not None:
        _set_tags(db, record, RecordAutographTag, "autograph_tags", data.autograph_tags)
    if data.genre_tags is not None:
        _set_tags(db, record, RecordGenreTag, "genre_tags", data.genre_tags)
    if data.country_tags is not None:
        _set_tags(db, record, RecordCountryTag, "country_tags", data.country_tags)
        _propagate_artist_country(
            db,
            artist=record.artist,
            country_tags=data.country_tags,
            exclude_id=record.id,
        )
    db.commit()
    return _reload_record(db, record.id)


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
    release_type: list[str] | None = None,
    genre: list[str] | None = None,
    country: list[str] | None = None,
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
    q = select(Record).options(*_record_load_options())

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

    if release_type:
        q = q.where(Record.release_type.in_(release_type))

    if genre:
        q = q.where(
            Record.id.in_(select(RecordGenreTag.record_id).where(RecordGenreTag.tag.in_(genre)))
        )

    if country:
        q = q.where(
            Record.id.in_(select(RecordCountryTag.record_id).where(RecordCountryTag.tag.in_(country)))
        )

    if pending:
        pending_clauses = []
        anim_ids = select(RecordAnimationTag.record_id)
        canvas_ids = select(RecordCanvasTag.record_id)
        for tag in pending:
            if tag == DERIVED_ANIMATION:
                pending_clauses.append(~Record.id.in_(anim_ids))
            elif tag == DERIVED_CANVAS:
                pending_clauses.append(~Record.id.in_(canvas_ids))
            else:
                pending_clauses.append(
                    Record.id.in_(
                        select(RecordPendingTag.record_id).where(
                            RecordPendingTag.tag == tag
                        )
                    )
                )
        if pending_clauses:
            q = q.where(or_(*pending_clauses))
    elif has_pending is True:
        q = q.where(
            or_(
                Record.id.in_(select(RecordPendingTag.record_id)),
                ~Record.id.in_(select(RecordAnimationTag.record_id)),
                ~Record.id.in_(select(RecordCanvasTag.record_id)),
            )
        )
    elif has_pending is False:
        q = q.where(
            ~Record.id.in_(select(RecordPendingTag.record_id)),
            Record.id.in_(select(RecordAnimationTag.record_id)),
            Record.id.in_(select(RecordCanvasTag.record_id)),
        )

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
        if field == "release_type":
            return (r.release_type or "").lower()
        if field == "genre":
            return ",".join(sorted(t.tag for t in r.genre_tags)).lower()
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

    total = sum(
        collection_unit_count(r.release_type, (t.tag for t in r.media_tags))
        for r in records_all
    )
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

    anim_missing = db.scalar(
        select(func.count())
        .select_from(Record)
        .where(~Record.id.in_(select(RecordAnimationTag.record_id)))
    ) or 0
    canvas_missing = db.scalar(
        select(func.count())
        .select_from(Record)
        .where(~Record.id.in_(select(RecordCanvasTag.record_id)))
    ) or 0
    pending_facet = facet_rows(RecordPendingTag)
    by_value = {f.value: f.count for f in pending_facet}
    if anim_missing:
        by_value[DERIVED_ANIMATION] = by_value.get(DERIVED_ANIMATION, 0) + anim_missing
    if canvas_missing:
        by_value[DERIVED_CANVAS] = by_value.get(DERIVED_CANVAS, 0) + canvas_missing
    pending_sorted = sorted(
        (FacetOption(value=k, count=v) for k, v in by_value.items()),
        key=lambda o: (-o.count, o.value.lower()),
    )

    return FacetsOut(
        media=facet_rows(RecordMediaTag),
        animation=facet_rows(RecordAnimationTag),
        canvas=facet_rows(RecordCanvasTag),
        autograph=facet_rows(RecordAutographTag),
        pending=pending_sorted,
        release_type=_release_type_facets(db),
        genre=facet_rows(RecordGenreTag),
        country=facet_rows(RecordCountryTag),
        artist=_artist_facets(db),
    )


def _artist_facets(db: Session) -> list[FacetOption]:
    rows = db.execute(
        select(Record.artist, func.count())
        .group_by(Record.artist)
        .order_by(func.count().desc(), Record.artist.asc())
    ).all()
    return [FacetOption(value=r[0], count=r[1]) for r in rows if r[0]]


def _release_type_facets(db: Session) -> list[FacetOption]:
    rows = db.execute(
        select(Record.release_type, func.count())
        .where(Record.release_type.isnot(None))
        .group_by(Record.release_type)
        .order_by(func.count().desc())
    ).all()
    return [FacetOption(value=r[0], count=r[1]) for r in rows if r[0]]
