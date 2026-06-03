"""Find media files by stem (cover key) in a folder."""

from __future__ import annotations

from pathlib import Path

IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp")
VIDEO_EXTENSIONS = (".mp4", ".webm", ".mov", ".m4v")
CARD_EXTENSIONS = IMAGE_EXTENSIONS + VIDEO_EXTENSIONS


def media_stem(stem: str, index: int = 1) -> str:
    """First file uses stem as-is; extras use ' (2)', ' (3)', … before the extension."""
    if index <= 1:
        return stem
    return f"{stem} ({index})"


def find_by_stem(
    folder: Path | None, stem: str, extensions: tuple[str, ...], *, index: int = 1
) -> Path | None:
    return _find_by_stem(folder, media_stem(stem, index), extensions)


def media_files_for_tags(
    folder: Path | None, stem: str, tag_count: int, extensions: tuple[str, ...]
) -> list[bool]:
    if tag_count <= 0:
        return []
    return [
        _find_by_stem(folder, media_stem(stem, i), extensions) is not None
        for i in range(1, tag_count + 1)
    ]


def _find_by_stem(folder: Path | None, stem: str, extensions: tuple[str, ...]) -> Path | None:
    if not folder:
        return None
    for ext in extensions:
        candidate = folder / f"{stem}{ext}"
        if candidate.is_file():
            return candidate
    stem_lower = stem.lower()
    for f in folder.iterdir():
        if not f.is_file():
            continue
        if f.suffix.lower() in extensions and f.stem.lower() == stem_lower:
            return f
    return None
