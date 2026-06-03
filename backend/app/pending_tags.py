"""Pending status: stored tags plus derived Animation/Canvas when tags are missing."""

from __future__ import annotations

from app.models import Record

DERIVED_ANIMATION = "Animation"
DERIVED_CANVAS = "Canvas"
DERIVED_TAGS = frozenset({DERIVED_ANIMATION, DERIVED_CANVAS})
EVERYTHING_TAG = "Everything"

STANDARD_PENDING_TAGS: tuple[str, ...] = (
    "Cover",
    "Landscape Photo",
    "Portrait Photo",
    "Landscape Wallpaper",
    "Portrait Wallpaper",
    "Spotify Front",
    "Spotify Back",
    "Landscape Card Front",
    "Landscape Card Back",
    "Portrait Card Front",
    "Portrait Card Back",
)

_STANDARD_ORDER = {tag: i for i, tag in enumerate(STANDARD_PENDING_TAGS)}


def expand_everything(tags: list[str]) -> list[str]:
    """Replace legacy Everything with the standard asset checklist."""
    if EVERYTHING_TAG not in tags:
        return tags
    out: list[str] = []
    seen: set[str] = set()
    for tag in tags:
        if tag == EVERYTHING_TAG:
            continue
        if tag not in seen:
            seen.add(tag)
            out.append(tag)
    for tag in STANDARD_PENDING_TAGS:
        if tag not in seen:
            seen.add(tag)
            out.append(tag)
    return out


def normalize_stored_pending(tags: list[str]) -> list[str]:
    expanded = expand_everything([tag.strip() for tag in tags if tag and tag.strip()])
    out: list[str] = []
    seen: set[str] = set()
    for tag in expanded:
        if tag in DERIVED_TAGS or tag in seen:
            continue
        seen.add(tag)
        out.append(tag)
    return sort_pending_tags(out)


def sort_pending_tags(tags: list[str]) -> list[str]:
    def key(tag: str) -> tuple[int, int, str]:
        if tag in DERIVED_TAGS:
            return (0, 0 if tag == DERIVED_ANIMATION else 1, tag)
        if tag in _STANDARD_ORDER:
            return (1, _STANDARD_ORDER[tag], tag)
        return (2, 0, tag.lower())

    return sorted(tags, key=key)


def build_pending_tags(record: Record) -> list[str]:
    tags: list[str] = []
    if not record.animation_tags:
        tags.append(DERIVED_ANIMATION)
    if not record.canvas_tags:
        tags.append(DERIVED_CANVAS)
    for t in record.pending_tags:
        if t.tag not in DERIVED_TAGS and t.tag not in tags:
            tags.append(t.tag)
    return sort_pending_tags(tags)
