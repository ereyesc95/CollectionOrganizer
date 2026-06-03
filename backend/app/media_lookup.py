"""One-time folder indexes for list API — avoids scanning media dirs per record."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from sqlalchemy.orm import Session

from app.animations import get_animations_folder
from app.autographs import get_autographs_folder
from app.canvas_files import get_canvas_folder
from app.card_files import CardType, get_card_folder
from app.covers import get_covers_folder
from app.media_find import CARD_EXTENSIONS, IMAGE_EXTENSIONS, VIDEO_EXTENSIONS, FolderIndex
from app.paths import DATA_DIR


@dataclass
class MediaLookup:
    covers: FolderIndex | None = None
    animations: FolderIndex | None = None
    canvas: FolderIndex | None = None
    autographs: FolderIndex | None = None
    autograph_uploads: FolderIndex | None = None
    card_spotify: FolderIndex | None = None
    card_landscape: FolderIndex | None = None
    card_portrait: FolderIndex | None = None

    @classmethod
    def build(cls, db: Session) -> MediaLookup:
        uploads = DATA_DIR / "autographs"
        return cls(
            covers=FolderIndex.build(get_covers_folder(db), IMAGE_EXTENSIONS),
            animations=FolderIndex.build(get_animations_folder(db), VIDEO_EXTENSIONS),
            canvas=FolderIndex.build(get_canvas_folder(db), VIDEO_EXTENSIONS),
            autographs=FolderIndex.build(get_autographs_folder(db), IMAGE_EXTENSIONS),
            autograph_uploads=FolderIndex.build(
                uploads if uploads.is_dir() else None, IMAGE_EXTENSIONS
            ),
            card_spotify=FolderIndex.build(
                get_card_folder(db, "spotify"), CARD_EXTENSIONS
            ),
            card_landscape=FolderIndex.build(
                get_card_folder(db, "landscape"), CARD_EXTENSIONS
            ),
            card_portrait=FolderIndex.build(
                get_card_folder(db, "portrait"), CARD_EXTENSIONS
            ),
        )

    def card_index(self, card_type: CardType) -> FolderIndex | None:
        if card_type == "spotify":
            return self.card_spotify
        if card_type == "landscape":
            return self.card_landscape
        return self.card_portrait

    def cover_exists(self, cover_key: str) -> bool:
        return self.covers is not None and self.covers.find(cover_key) is not None
