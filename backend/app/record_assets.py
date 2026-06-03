from __future__ import annotations

from sqlalchemy.orm import Session

from app.card_files import CardSide, CardType, card_stem, card_url_for, find_card_path
from app.canvas_files import canvas_url_for, find_canvas_path
from app.media_lookup import MediaLookup
from app.schemas import FlipCardAssetsOut, MediaSideOut, RecordAssetsOut
from app.models import Record


def _side_out(
    db: Session,
    record: Record,
    card_type: CardType,
    side: CardSide,
    *,
    lookup: MediaLookup | None = None,
) -> MediaSideOut:
    if lookup:
        idx = lookup.card_index(card_type)
        path = idx.find(card_stem(record.cover_key, side)) if idx else None
    else:
        path = find_card_path(db, card_type, record.cover_key, side)
    if not path:
        return MediaSideOut()
    return MediaSideOut(has_file=True, url=card_url_for(record.id, card_type, side))


def build_record_assets(
    db: Session, record: Record, *, lookup: MediaLookup | None = None
) -> RecordAssetsOut:
    if lookup and lookup.canvas:
        canvas_path = lookup.canvas.find(record.cover_key)
    else:
        canvas_path = find_canvas_path(db, record.cover_key)
    return RecordAssetsOut(
        canvas=MediaSideOut(
            has_file=canvas_path is not None,
            url=canvas_url_for(record.id) if canvas_path else None,
        ),
        spotify=FlipCardAssetsOut(
            front=_side_out(db, record, "spotify", "front", lookup=lookup),
            back=_side_out(db, record, "spotify", "back", lookup=lookup),
        ),
        landscape_card=FlipCardAssetsOut(
            front=_side_out(db, record, "landscape", "front", lookup=lookup),
            back=_side_out(db, record, "landscape", "back", lookup=lookup),
        ),
        portrait_card=FlipCardAssetsOut(
            front=_side_out(db, record, "portrait", "front", lookup=lookup),
            back=_side_out(db, record, "portrait", "back", lookup=lookup),
        ),
    )
