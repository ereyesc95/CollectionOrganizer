from pathlib import Path

from sqlalchemy.orm import Session

from app.config import settings
from app.models import AppSetting

ANIMATION_EXTENSIONS = (".mp4", ".webm", ".mov", ".m4v")


def get_animations_folder(db: Session) -> Path | None:
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


def find_animation_path(folder: Path | None, cover_key: str) -> Path | None:
    if not folder:
        return None
    for ext in ANIMATION_EXTENSIONS:
        candidate = folder / f"{cover_key}{ext}"
        if candidate.is_file():
            return candidate
    key_lower = cover_key.lower()
    for f in folder.iterdir():
        if f.is_file() and f.suffix.lower() in ANIMATION_EXTENSIONS:
            if f.stem.lower() == key_lower:
                return f
    return None


def animation_url_for(record_id: int) -> str:
    return f"/api/animations/{record_id}"
