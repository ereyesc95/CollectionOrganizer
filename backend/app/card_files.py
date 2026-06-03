from __future__ import annotations

from pathlib import Path
from typing import Literal

from sqlalchemy.orm import Session

from app.media_find import CARD_EXTENSIONS, find_by_stem
from app.source_folders import (
    SUB_CARDS_LANDSCAPE,
    SUB_CARDS_PORTRAIT,
    SUB_CARDS_SPOTIFY,
    get_subfolder,
)

CardType = Literal["spotify", "landscape", "portrait"]
CardSide = Literal["front", "back"]

_CARD_SUBFOLDERS: dict[CardType, str] = {
    "spotify": SUB_CARDS_SPOTIFY,
    "landscape": SUB_CARDS_LANDSCAPE,
    "portrait": SUB_CARDS_PORTRAIT,
}


def get_card_folder(db: Session, card_type: CardType) -> Path | None:
    return get_subfolder(db, _CARD_SUBFOLDERS[card_type])


def card_stem(cover_key: str, side: CardSide) -> str:
    suffix = ", Front" if side == "front" else ", Back"
    return f"{cover_key}{suffix}"


def find_card_path(
    db: Session, card_type: CardType, cover_key: str, side: CardSide
) -> Path | None:
    folder = get_card_folder(db, card_type)
    return find_by_stem(folder, card_stem(cover_key, side), CARD_EXTENSIONS)


def card_url_for(record_id: int, card_type: CardType, side: CardSide) -> str:
    return f"/api/cards/{card_type}/{side}/{record_id}"
