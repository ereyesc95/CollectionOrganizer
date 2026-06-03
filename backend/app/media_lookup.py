"""Folder indexes for list API — built once and reused until paths or folders change."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from sqlalchemy.orm import Session

from app.animations import get_animations_folder
from app.autographs import get_autographs_folder
from app.canvas_files import get_canvas_folder
from app.card_files import CardType, get_card_folder
from app.covers import get_covers_folder
from app.card_files import CardSide, CardType, card_stem
from app.covers import find_cover_path, get_covers_folder
from app.media_find import CARD_EXTENSIONS, IMAGE_EXTENSIONS, VIDEO_EXTENSIONS, FolderIndex, media_stem
from app.paths import DATA_DIR, database_file

_cached_lookup: MediaLookup | None = None
_cached_fingerprint: str | None = None


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


def _folder_stat_token(path: Path | None) -> str:
    if not path or not path.is_dir():
        return ""
    try:
        st = path.stat()
        return f"{path.resolve()}:{st.st_mtime_ns}:{st.st_size}"
    except OSError:
        return str(path)


def media_lookup_fingerprint(db: Session) -> str:
    """Changes when configured media folders or their contents' directory metadata change."""
    uploads = DATA_DIR / "autographs"
    folders = (
        get_covers_folder(db),
        get_animations_folder(db),
        get_canvas_folder(db),
        get_autographs_folder(db),
        uploads if uploads.is_dir() else None,
        get_card_folder(db, "spotify"),
        get_card_folder(db, "landscape"),
        get_card_folder(db, "portrait"),
    )
    return "|".join(_folder_stat_token(p) for p in folders)


def database_epoch_token() -> str:
    db_path = database_file()
    if not db_path.is_file():
        return "missing"
    try:
        st = db_path.stat()
        return f"{db_path.resolve()}:{st.st_mtime_ns}:{st.st_size}"
    except OSError:
        return str(db_path)


def cache_epoch(db: Session) -> str:
    return f"{database_epoch_token()}|{media_lookup_fingerprint(db)}"


def get_media_lookup(db: Session) -> MediaLookup:
    global _cached_lookup, _cached_fingerprint
    fp = media_lookup_fingerprint(db)
    if _cached_lookup is None or fp != _cached_fingerprint:
        _cached_lookup = MediaLookup.build(db)
        _cached_fingerprint = fp
    return _cached_lookup


def invalidate_media_lookup_cache() -> None:
    global _cached_lookup, _cached_fingerprint
    _cached_lookup = None
    _cached_fingerprint = None
    from app.list_cache import invalidate_list_cache

    invalidate_list_cache()


def _index_find(index: FolderIndex | None, stem: str) -> Path | None:
    return index.find(stem) if index else None


def cached_cover_path(db: Session, cover_key: str) -> Path | None:
    lookup = get_media_lookup(db)
    path = _index_find(lookup.covers, cover_key)
    if path:
        return path
    return find_cover_path(get_covers_folder(db), cover_key)


def cached_animation_path(db: Session, cover_key: str, *, index: int = 1) -> Path | None:
    from app.animations import find_animation_path, get_animations_folder

    lookup = get_media_lookup(db)
    stem = media_stem(cover_key, index)
    path = _index_find(lookup.animations, stem)
    if path:
        return path
    return find_animation_path(get_animations_folder(db), cover_key, index=index)


def cached_canvas_path(db: Session, cover_key: str, *, index: int = 1) -> Path | None:
    from app.canvas_files import find_canvas_path

    lookup = get_media_lookup(db)
    stem = media_stem(cover_key, index)
    path = _index_find(lookup.canvas, stem)
    if path:
        return path
    return find_canvas_path(db, cover_key, index=index)


def cached_card_path(
    db: Session, card_type: CardType, cover_key: str, side: CardSide
) -> Path | None:
    from app.card_files import find_card_path

    lookup = get_media_lookup(db)
    stem = card_stem(cover_key, side)
    path = _index_find(lookup.card_index(card_type), stem)
    if path:
        return path
    return find_card_path(db, card_type, cover_key, side)


def cached_autograph_path(
    db: Session, record_id: int, cover_key: str
) -> Path | None:
    from app.autographs import find_autograph_path

    path, _ = find_autograph_path(db, record_id, cover_key, lookup=get_media_lookup(db))
    return path
