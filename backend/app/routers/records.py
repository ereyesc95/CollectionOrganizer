from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app import crud
from app.database import get_db
from app.list_cache import list_cache_get, list_cache_set
from app.media_lookup import cache_epoch, get_media_lookup
from app.models import Record
from app.parse_album import build_cover_key, parse_album
from app.schemas import (
    FacetsOut,
    ParsePreview,
    RecordCreate,
    RecordListOut,
    RecordOut,
    RecordUpdate,
)

router = APIRouter(prefix="/api/records", tags=["records"])


def _list_query_key(
    *,
    search: str,
    media: str,
    animation: str,
    canvas: str,
    autograph: str,
    release_type: str,
    genre: str,
    country: str,
    pending: str,
    has_autograph: str | None,
    has_animation: str | None,
    has_canvas: str | None,
    has_pending: str | None,
    has_cover: str | None,
    sort: str,
    order: str,
    page: int,
    page_size: int,
    unit: str = "",
) -> str:
    parts = [
        ("search", search),
        ("media", media),
        ("animation", animation),
        ("canvas", canvas),
        ("autograph", autograph),
        ("release_type", release_type),
        ("genre", genre),
        ("country", country),
        ("pending", pending),
        ("has_autograph", has_autograph or ""),
        ("has_animation", has_animation or ""),
        ("has_canvas", has_canvas or ""),
        ("has_pending", has_pending or ""),
        ("has_cover", has_cover or ""),
        ("sort", sort),
        ("order", order),
        ("page", str(page)),
        ("page_size", str(page_size)),
        ("unit", unit),
    ]
    return "&".join(f"{k}={v}" for k, v in parts)


@router.get("/facets", response_model=FacetsOut)
def facets(db: Session = Depends(get_db)):
    return crud.get_facets(db)


@router.get("", response_model=RecordListOut)
def list_records(
    db: Session = Depends(get_db),
    search: str = "",
    media: str = Query(""),
    animation: str = Query(""),
    canvas: str = Query(""),
    autograph: str = Query(""),
    release_type: str = Query(""),
    genre: str = Query(""),
    country: str = Query(""),
    pending: str = Query(""),
    has_autograph: str | None = None,
    has_animation: str | None = None,
    has_canvas: str | None = None,
    has_pending: str | None = None,
    has_cover: str | None = None,
    sort: str = "artist",
    order: str = "asc",
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=5000),
    unit: str = Query("record"),
):
    def split_param(s: str) -> list[str]:
        return [x.strip() for x in s.split(",") if x.strip()]

    def tri_bool(v: str | None) -> bool | None:
        if v is None or v == "":
            return None
        return v.lower() in ("true", "1", "yes")

    list_unit = "album" if unit == "album" else "record"

    query_key = _list_query_key(
        search=search,
        media=media,
        animation=animation,
        canvas=canvas,
        autograph=autograph,
        release_type=release_type,
        genre=genre,
        country=country,
        pending=pending,
        has_autograph=has_autograph,
        has_animation=has_animation,
        has_canvas=has_canvas,
        has_pending=has_pending,
        has_cover=has_cover,
        sort=sort,
        order=order,
        page=page,
        page_size=page_size,
        unit=list_unit,
    )
    epoch = cache_epoch(db)
    cached = list_cache_get(epoch, query_key)
    if cached is not None:
        return cached

    items, total, record_total = crud.list_records(
        db,
        search=search,
        media=split_param(media) or None,
        animation=split_param(animation) or None,
        canvas=split_param(canvas) or None,
        autograph=split_param(autograph) or None,
        release_type=split_param(release_type) or None,
        genre=split_param(genre) or None,
        country=split_param(country) or None,
        pending=split_param(pending) or None,
        has_autograph=tri_bool(has_autograph),
        has_animation=tri_bool(has_animation),
        has_canvas=tri_bool(has_canvas),
        has_pending=tri_bool(has_pending),
        has_cover=tri_bool(has_cover),
        sort=sort,
        order=order,
        page=page,
        page_size=page_size,
        unit=list_unit,
    )
    lookup = get_media_lookup(db)
    result = RecordListOut(
        items=[crud.record_to_out(db, r, lookup=lookup) for r in items],
        total=total,
        record_total=record_total,
        page=page,
        page_size=page_size,
    )
    list_cache_set(epoch, query_key, result)
    return result


@router.get("/parse-preview", response_model=ParsePreview)
def parse_preview(cover_key: str = Query(...)):
    p = parse_album(cover_key)
    return ParsePreview(
        cover_key=p.cover_key,
        artist=p.artist,
        record_year=p.record_year,
        title=p.title,
        edition_year=p.edition_year,
        edition_title=p.edition_title,
    )


@router.get("/{record_id}", response_model=RecordOut)
def get_record(record_id: int, db: Session = Depends(get_db)):
    record = crud.get_record(db, record_id)
    if not record:
        raise HTTPException(404, "Record not found")
    return crud.record_to_out(db, record, lookup=get_media_lookup(db))


@router.post("", response_model=RecordOut, status_code=201)
def create_record(data: RecordCreate, db: Session = Depends(get_db)):
    try:
        cover_key = build_cover_key(
            data.artist,
            data.record_year,
            data.title,
            data.edition_year,
            data.edition_title,
        )
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    existing = db.query(Record).filter(Record.cover_key == cover_key).first()
    if existing:
        raise HTTPException(400, "A record with this album/edition already exists")
    record = crud.create_record(db, data)
    return crud.record_to_out(db, record)


@router.patch("/{record_id}", response_model=RecordOut)
def update_record(record_id: int, data: RecordUpdate, db: Session = Depends(get_db)):
    record = crud.get_record(db, record_id)
    if not record:
        raise HTTPException(404, "Record not found")
    artist = data.artist.strip() if data.artist is not None else record.artist
    title = data.title.strip() if data.title is not None else record.title
    record_year = data.record_year if data.record_year is not None else record.record_year
    edition_year = (
        data.edition_year if data.edition_year is not None else record.edition_year
    )
    edition_title = (
        data.edition_title.strip() if data.edition_title is not None else record.edition_title
    )
    if data.edition_title is not None and not edition_title:
        edition_title = None
    try:
        new_key = build_cover_key(
            artist, record_year, title, edition_year, edition_title
        )
    except ValueError as e:
        raise HTTPException(400, str(e)) from e
    if new_key != record.cover_key:
        dup = db.query(Record).filter(Record.cover_key == new_key).first()
        if dup and dup.id != record.id:
            raise HTTPException(400, "Another record already uses this album/edition")
    record = crud.update_record(db, record, data)
    return crud.record_to_out(db, record)


@router.delete("/{record_id}", status_code=204)
def delete_record(record_id: int, db: Session = Depends(get_db)):
    record = db.get(Record, record_id)
    if not record:
        raise HTTPException(404, "Record not found")
    crud.delete_record(db, record)

