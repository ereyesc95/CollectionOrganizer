from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.card_files import CardSide, CardType
from app.database import get_db
from app.media_lookup import cached_card_path
from app.media_response import cached_media_file
from app.models import Record

router = APIRouter(prefix="/api/cards", tags=["cards"])

_VALID_TYPES: set[CardType] = {"spotify", "landscape", "portrait"}
_VALID_SIDES: set[CardSide] = {"front", "back"}


@router.get("/{card_type}/{side}/{record_id}")
def serve_card(
    card_type: str,
    side: str,
    record_id: int,
    db: Session = Depends(get_db),
):
    if card_type not in _VALID_TYPES:
        raise HTTPException(400, "Invalid card type")
    if side not in _VALID_SIDES:
        raise HTTPException(400, "Invalid side")
    record = db.get(Record, record_id)
    if not record:
        raise HTTPException(404, "Record not found")
    path = cached_card_path(db, card_type, record.cover_key, side)  # type: ignore[arg-type]
    if not path:
        raise HTTPException(404, "Card file not found")
    return cached_media_file(path)
