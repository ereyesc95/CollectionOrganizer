"""Find media files by stem (cover key) in a folder."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp")
VIDEO_EXTENSIONS = (".mp4", ".webm", ".mov", ".m4v")
CARD_EXTENSIONS = IMAGE_EXTENSIONS + VIDEO_EXTENSIONS


@dataclass
class FolderIndex:
    """Stem → file map built with a single directory scan."""

    folder: Path
    extensions: tuple[str, ...]
    _by_stem: dict[str, Path] = field(default_factory=dict)

    @classmethod
    def build(cls, folder: Path | None, extensions: tuple[str, ...]) -> FolderIndex | None:
        if folder is None or not folder.is_dir():
            return None
        ext_set = {e.lower() for e in extensions}
        by_stem: dict[str, Path] = {}
        try:
            for f in folder.iterdir():
                if not f.is_file() or f.suffix.lower() not in ext_set:
                    continue
                key = f.stem.lower()
                if key not in by_stem:
                    by_stem[key] = f
        except OSError:
            pass
        return cls(folder=folder, extensions=extensions, _by_stem=by_stem)

    def find(self, stem: str) -> Path | None:
        for ext in self.extensions:
            candidate = self.folder / f"{stem}{ext}"
            try:
                if candidate.is_file():
                    return candidate
            except OSError:
                continue
        return self._by_stem.get(stem.lower())


def media_stem(stem: str, index: int = 1) -> str:
    """First file uses stem as-is; extras use ' (2)', ' (3)', … before the extension."""
    if index <= 1:
        return stem
    return f"{stem} ({index})"


def find_by_stem(
    folder: Path | None,
    stem: str,
    extensions: tuple[str, ...],
    *,
    index: int = 1,
    cache: FolderIndex | None = None,
) -> Path | None:
    name = media_stem(stem, index)
    if cache is not None:
        return cache.find(name)
    return _find_by_stem(folder, name, extensions)


def media_files_for_tags(
    folder: Path | None,
    stem: str,
    tag_count: int,
    extensions: tuple[str, ...],
    *,
    cache: FolderIndex | None = None,
) -> list[bool]:
    if tag_count <= 0:
        return []
    return [
        find_by_stem(folder, stem, extensions, index=i, cache=cache) is not None
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
