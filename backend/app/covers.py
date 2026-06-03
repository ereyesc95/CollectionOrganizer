from pathlib import Path

from sqlalchemy.orm import Session

from app.config import settings
from app.media_find import IMAGE_EXTENSIONS, find_by_stem
from app.models import AppSetting
from app.source_folders import SUB_COVERS, get_subfolder


def get_covers_folder(db: Session) -> Path | None:
    sub = get_subfolder(db, SUB_COVERS)
    if sub:
        return sub
    row = db.get(AppSetting, "covers_folder")
    path_str = (row.value if row and row.value else None) or settings.covers_folder
    if not path_str:
        return None
    p = Path(path_str)
    return p if p.is_dir() else None


def set_covers_folder(db: Session, path: str) -> None:
    row = db.get(AppSetting, "covers_folder")
    if row:
        row.value = path
    else:
        db.add(AppSetting(key="covers_folder", value=path))
    db.commit()
    settings.covers_folder = path


def find_cover_path(folder: Path | None, cover_key: str) -> Path | None:
    return find_by_stem(folder, cover_key, IMAGE_EXTENSIONS)


def cover_url_for(record_id: int) -> str:
    return f"/api/covers/{record_id}"
