"""Resolve install vs bundle paths (dev and PyInstaller frozen builds)."""
from __future__ import annotations

import sys
from pathlib import Path


def is_frozen() -> bool:
    return getattr(sys, "frozen", False)


def install_dir() -> Path:
    """Writable app location (next to .exe when packaged)."""
    if is_frozen():
        return Path(sys.executable).resolve().parent
    return Path(__file__).resolve().parents[2]


def bundle_dir() -> Path:
    """Read-only bundled assets (_MEIPASS when packaged)."""
    if is_frozen():
        return Path(getattr(sys, "_MEIPASS"))
    return Path(__file__).resolve().parents[2]


PROJECT_ROOT = install_dir()
BUNDLE_ROOT = bundle_dir()
DATA_DIR = PROJECT_ROOT / "data"


def resolve_frontend_dist() -> Path | None:
    """Find built UI (bundled _internal, or copied next to the exe)."""
    candidates = [
        BUNDLE_ROOT / "frontend" / "dist",
        PROJECT_ROOT / "frontend" / "dist",
        PROJECT_ROOT / "_internal" / "frontend" / "dist",
    ]
    seen: set[str] = set()
    for path in candidates:
        key = str(path.resolve())
        if key in seen:
            continue
        seen.add(key)
        if not (path / "index.html").is_file():
            continue
        assets = path / "assets"
        if assets.is_dir() and any(assets.iterdir()):
            return path
    return None


FRONTEND_DIST = resolve_frontend_dist() or (BUNDLE_ROOT / "frontend" / "dist")


def ensure_data_dir() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    (DATA_DIR / "autographs").mkdir(parents=True, exist_ok=True)


def database_file() -> Path:
    """
    SQLite database path.

    When the packaged app lives at repo/dist/SleeveStack/, use repo/data/collection.db
    so git pull updates the DB the app reads. Portable-only installs keep data/ next to the exe.
    """
    ensure_data_dir()
    local = DATA_DIR / "collection.db"
    if is_frozen():
        for base in (install_dir().parent.parent, install_dir().parent):
            candidate = (base / "data" / "collection.db").resolve()
            if candidate.is_file():
                return candidate
    return local


def default_xlsx_path() -> Path | None:
    for base in (PROJECT_ROOT, BUNDLE_ROOT):
        candidate = base / "Collection.xlsx"
        if candidate.is_file():
            return candidate
    return None
