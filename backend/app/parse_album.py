"""Parse ALBUM strings into structured fields; preserve cover_key."""
from __future__ import annotations

import re
from dataclasses import dataclass

EDITION_KEYWORDS = re.compile(
    r"\b(Edition|Anniversary|Deluxe|Remaster|Limited|Expanded|Editio)\b",
    re.IGNORECASE,
)


@dataclass
class ParsedAlbum:
    cover_key: str
    artist: str
    record_year: int | None
    title: str
    edition_year: int | None = None
    edition_title: str | None = None


def _split_tags(value: str | None) -> list[str]:
    if not value or not str(value).strip():
        return []
    raw = str(value).replace("\n", "/").strip()
    tags: list[str] = []
    for part in raw.split("/"):
        t = part.strip()
        if not t:
            continue
        if t.lower() == "youtube":
            t = "YouTube"
        elif t.lower() == "youtube" or t == "Youtube":
            t = "YouTube"
        tags.append(t)
    return tags


def normalize_tag(value: str) -> str:
    v = value.strip()
    if v.lower() == "youtube":
        return "YouTube"
    return v


def split_tags(value: str | None) -> list[str]:
    return [normalize_tag(t) for t in _split_tags(value)]


def parse_album(raw: str) -> ParsedAlbum:
    s = raw.strip()
    cover_key = s

    # Artist, YYYY, Title (no dot) — 2 known rows
    m_alt = re.match(r"^(.+?),\s*(\d{4}),\s*(.+)$", s)
    if m_alt and ". " not in s.split(",", 1)[-1][:20]:
        return ParsedAlbum(
            cover_key=cover_key,
            artist=m_alt.group(1).strip(),
            record_year=int(m_alt.group(2)),
            title=m_alt.group(3).strip(),
        )

    if "," not in s:
        return ParsedAlbum(cover_key=cover_key, artist=s, record_year=None, title="")

    artist, rest = s.split(",", 1)
    artist = artist.strip()
    rest = rest.strip()

    m = re.match(r"^(\d{4})\.\s*(.+)$", rest)
    if not m:
        return ParsedAlbum(cover_key=cover_key, artist=artist, record_year=None, title=rest)

    record_year = int(m.group(1))
    title_rest = m.group(2).strip()

    em = re.search(r",\s*(\d{4})\s+(.+)$", title_rest)
    if em and EDITION_KEYWORDS.search(em.group(2)):
        title = title_rest[: em.start()].strip()
        return ParsedAlbum(
            cover_key=cover_key,
            artist=artist,
            record_year=record_year,
            title=title,
            edition_year=int(em.group(1)),
            edition_title=em.group(2).strip(),
        )

    return ParsedAlbum(
        cover_key=cover_key,
        artist=artist,
        record_year=record_year,
        title=title_rest,
    )
