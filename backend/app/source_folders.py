"""Single source root with required media subfolders."""

from __future__ import annotations

from pathlib import Path

from sqlalchemy.orm import Session

from app.models import AppSetting

SOURCE_ROOT_KEY = "source_folder"

SUB_COVERS = "Covers"
SUB_ANIMATIONS = "Animations"
SUB_CANVAS = "Canvas"
SUB_AUTOGRAPHS = "Autographs"
SUB_CARDS_LANDSCAPE = "Cards - Landscape"
SUB_CARDS_PORTRAIT = "Cards - Portrait"
SUB_CARDS_SPOTIFY = "Cards - Spotify"

REQUIRED_SUBFOLDERS: tuple[str, ...] = (
    SUB_COVERS,
    SUB_ANIMATIONS,
    SUB_CANVAS,
    SUB_AUTOGRAPHS,
    SUB_CARDS_LANDSCAPE,
    SUB_CARDS_PORTRAIT,
    SUB_CARDS_SPOTIFY,
)


def validate_source_root(root: Path) -> list[str]:
    missing: list[str] = []
    if not root.is_dir():
        return ["Source path is not a directory"]
    for name in REQUIRED_SUBFOLDERS:
        if not (root / name).is_dir():
            missing.append(name)
    return missing


def get_source_root(db: Session) -> Path | None:
    row = db.get(AppSetting, SOURCE_ROOT_KEY)
    if row and row.value:
        p = Path(row.value)
        if p.is_dir():
            return p
    return None


def set_source_root(db: Session, path: str) -> list[str]:
    root = Path(path)
    missing = validate_source_root(root)
    if missing:
        return missing
    row = db.get(AppSetting, SOURCE_ROOT_KEY)
    if row:
        row.value = str(root.resolve())
    else:
        db.add(AppSetting(key=SOURCE_ROOT_KEY, value=str(root.resolve())))
    db.commit()
    return []


def get_subfolder(db: Session, subfolder: str) -> Path | None:
    root = get_source_root(db)
    if root:
        p = root / subfolder
        return p if p.is_dir() else None
    return None
