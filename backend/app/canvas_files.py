from pathlib import Path

from sqlalchemy.orm import Session

from app.media_find import VIDEO_EXTENSIONS, find_by_stem, media_files_for_tags
from app.source_folders import SUB_CANVAS, get_subfolder


def get_canvas_folder(db: Session) -> Path | None:
    return get_subfolder(db, SUB_CANVAS)


def find_canvas_path(db: Session, cover_key: str, *, index: int = 1) -> Path | None:
    return find_by_stem(get_canvas_folder(db), cover_key, VIDEO_EXTENSIONS, index=index)


def canvas_files_for_tags(
    db: Session, cover_key: str, tag_count: int, *, cache=None
) -> list[bool]:
    return media_files_for_tags(
        get_canvas_folder(db), cover_key, tag_count, VIDEO_EXTENSIONS, cache=cache
    )


def canvas_url_for(record_id: int, *, index: int = 1) -> str:
    if index <= 1:
        return f"/api/canvas/{record_id}"
    return f"/api/canvas/{record_id}?index={index}"
