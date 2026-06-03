import shutil
from pathlib import Path
from typing import TYPE_CHECKING, Literal

from sqlalchemy.orm import Session

from app.config import settings
from app.media_find import IMAGE_EXTENSIONS, find_by_stem

if TYPE_CHECKING:
    from app.media_lookup import MediaLookup
from app.models import AppSetting
from app.paths import DATA_DIR, ensure_data_dir
from app.source_folders import SUB_AUTOGRAPHS, get_subfolder

ensure_data_dir()
UPLOADS_DIR = DATA_DIR / "autographs"

AutographSource = Literal["folder", "upload"]


def get_autographs_folder(db: Session) -> Path | None:
    sub = get_subfolder(db, SUB_AUTOGRAPHS)
    if sub:
        return sub
    row = db.get(AppSetting, "autographs_folder")
    path_str = (row.value if row and row.value else None) or settings.autographs_folder
    if not path_str:
        return None
    p = Path(path_str)
    return p if p.is_dir() else None


def set_autographs_folder(db: Session, path: str) -> None:
    row = db.get(AppSetting, "autographs_folder")
    if row:
        row.value = path
    else:
        db.add(AppSetting(key="autographs_folder", value=path))
    db.commit()
    settings.autographs_folder = path


def _find_in_folder(folder: Path, stem: str) -> Path | None:
    return find_by_stem(folder, stem, IMAGE_EXTENSIONS)


def find_uploaded_autograph(record_id: int) -> Path | None:
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    return _find_in_folder(UPLOADS_DIR, str(record_id))


def find_folder_autograph(db: Session, cover_key: str) -> Path | None:
    folder = get_autographs_folder(db)
    if not folder:
        return None
    return _find_in_folder(folder, cover_key)


def find_autograph_path(
    db: Session,
    record_id: int,
    cover_key: str,
    *,
    lookup: "MediaLookup | None" = None,
) -> tuple[Path | None, AutographSource | None]:
    """Folder is the default; per-record upload overrides when present."""
    if lookup and lookup.autograph_uploads:
        uploaded = lookup.autograph_uploads.find(str(record_id))
    else:
        uploaded = find_uploaded_autograph(record_id)
    if uploaded:
        return uploaded, "upload"
    if lookup and lookup.autographs:
        folder_path = lookup.autographs.find(cover_key)
    else:
        folder_path = find_folder_autograph(db, cover_key)
    if folder_path:
        return folder_path, "folder"
    return None, None


def autograph_url_for(record_id: int) -> str:
    return f"/api/autographs/{record_id}"


def save_autograph(record_id: int, filename: str, content: bytes) -> Path:
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    ext = Path(filename).suffix.lower()
    if ext not in PHOTO_EXTENSIONS:
        ext = ".jpg"
    for old in UPLOADS_DIR.glob(f"{record_id}.*"):
        old.unlink(missing_ok=True)
    dest = UPLOADS_DIR / f"{record_id}{ext}"
    dest.write_bytes(content)
    return dest


def delete_autograph(record_id: int) -> None:
    for old in UPLOADS_DIR.glob(f"{record_id}.*"):
        old.unlink(missing_ok=True)


def _clear_cover_key_files(folder: Path, cover_key: str) -> None:
    key_lower = cover_key.lower()
    for old in folder.iterdir():
        if old.is_file() and old.suffix.lower() in PHOTO_EXTENSIONS:
            if old.stem.lower() == key_lower:
                old.unlink(missing_ok=True)


def import_autograph_from_path(
    db: Session,
    record_id: int,
    cover_key: str,
    source: Path,
) -> Path:
    if not source.is_file():
        raise FileNotFoundError(str(source))
    ext = source.suffix.lower()
    if ext not in PHOTO_EXTENSIONS:
        raise ValueError("Not a supported image file")
    folder = get_autographs_folder(db)
    if folder:
        _clear_cover_key_files(folder, cover_key)
        dest = folder / f"{cover_key}{ext}"
        shutil.copy2(source, dest)
        return dest
    content = source.read_bytes()
    if len(content) > 15 * 1024 * 1024:
        raise ValueError("File too large (max 15MB)")
    return save_autograph(record_id, source.name, content)
