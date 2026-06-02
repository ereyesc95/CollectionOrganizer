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
FRONTEND_DIST = BUNDLE_ROOT / "frontend" / "dist"


def ensure_data_dir() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    (DATA_DIR / "autographs").mkdir(parents=True, exist_ok=True)


def default_xlsx_path() -> Path | None:
    for base in (PROJECT_ROOT, BUNDLE_ROOT):
        candidate = base / "Collection.xlsx"
        if candidate.is_file():
            return candidate
    return None
