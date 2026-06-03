from pathlib import Path

from sqlalchemy.orm import Session

from app.config import settings
from app.media_find import VIDEO_EXTENSIONS, find_by_stem, media_files_for_tags
from app.models import AppSetting
from app.source_folders import SUB_ANIMATIONS, get_subfolder


def get_animations_folder(db: Session) -> Path | None:
    sub = get_subfolder(db, SUB_ANIMATIONS)
    if sub:
        return sub
    row = db.get(AppSetting, "animations_folder")
    path_str = (row.value if row and row.value else None) or getattr(
        settings, "animations_folder", ""
    )
    if not path_str:
        return None
    p = Path(path_str)
    return p if p.is_dir() else None


def set_animations_folder(db: Session, path: str) -> None:
    row = db.get(AppSetting, "animations_folder")
    if row:
        row.value = path
    else:
        db.add(AppSetting(key="animations_folder", value=path))
    db.commit()


def find_animation_path(
    folder: Path | None, cover_key: str, *, index: int = 1
) -> Path | None:
    return find_by_stem(folder, cover_key, VIDEO_EXTENSIONS, index=index)


def animation_files_for_tags(folder: Path | None, cover_key: str, tag_count: int) -> list[bool]:
    return media_files_for_tags(folder, cover_key, tag_count, VIDEO_EXTENSIONS)


def animation_url_for(record_id: int, *, index: int = 1) -> str:
    if index <= 1:
        return f"/api/animations/{record_id}"
    return f"/api/animations/{record_id}?index={index}"
