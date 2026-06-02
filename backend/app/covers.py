from pathlib import Path

from sqlalchemy.orm import Session

from app.config import settings
from app.models import AppSetting

COVER_EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp")


def get_covers_folder(db: Session) -> Path | None:
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
    if not folder:
        return None
    for ext in COVER_EXTENSIONS:
        candidate = folder / f"{cover_key}{ext}"
        if candidate.is_file():
            return candidate
    # case-insensitive fallback
    key_lower = cover_key.lower()
    for f in folder.iterdir():
        if f.is_file() and f.stem.lower() == key_lower:
            return f
    return None


def cover_url_for(record_id: int) -> str:
    return f"/api/covers/{record_id}"
