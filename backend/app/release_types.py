"""Release / album type labels stored on records."""

from __future__ import annotations

from collections.abc import Iterable

RELEASE_TYPES: tuple[str, ...] = (
    "Studio Album",
    "EP",
    "Compilation",
    "Live Album",
    "Single",
)

VALID_RELEASE_TYPES: frozenset[str] = frozenset(RELEASE_TYPES)


def normalize_release_type(value: str | None) -> str | None:
    if not value:
        return None
    v = value.strip()
    if not v:
        return None
    for t in RELEASE_TYPES:
        if t.lower() == v.lower():
            return t
    return v


def collection_unit_count(
    release_type: str | None, media_tags: Iterable[str]
) -> int:
    """Physical items in the collection.

    Compilation box sets are packaging for albums already owned (0).
    CD+DVD on the same record is one combo unit, not two.
    Other media tags on one record each add a unit (e.g. CD+LP = 2).
    """
    tags = {t.strip().upper() for t in media_tags if t and str(t).strip()}
    if (release_type or "").strip().lower() == "compilation" and "BOX" in tags:
        return 0
    if not tags:
        return 1
    remaining = set(tags)
    units = 0
    if "CD" in remaining and "DVD" in remaining:
        units += 1
        remaining -= {"CD", "DVD"}
    units += len(remaining)
    return units or 1
