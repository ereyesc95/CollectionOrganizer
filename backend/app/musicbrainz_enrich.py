"""Look up release type and genres from MusicBrainz (free API, rate-limited)."""

from __future__ import annotations

import re
import time
import urllib.parse
import urllib.request
import json

from app.release_types import RELEASE_TYPES, normalize_release_type

USER_AGENT = "RecordStack/1.0 (local collection organizer)"
MAX_GENRES = 3
_LAST_REQUEST_AT = 0.0
MIN_INTERVAL = 1.1


def _rate_limit() -> None:
    global _LAST_REQUEST_AT
    elapsed = time.monotonic() - _LAST_REQUEST_AT
    if elapsed < MIN_INTERVAL:
        time.sleep(MIN_INTERVAL - elapsed)
    _LAST_REQUEST_AT = time.monotonic()


def _get_json(url: str) -> dict | None:
    _rate_limit()
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            return json.loads(resp.read().decode())
    except Exception:
        return None


def _escape_query(value: str) -> str:
    return value.replace('"', '\\"')


def map_musicbrainz_type(primary: str | None, secondaries: list[str] | None) -> str | None:
    sec = {s.lower() for s in (secondaries or [])}
    p = (primary or "").strip()
    if p == "Single":
        return "Single"
    if p == "EP":
        return "EP"
    if p == "Compilation" or "compilation" in sec:
        return "Compilation"
    if "live" in sec:
        return "Live Album"
    if p == "Album":
        return "Studio Album"
    return None


def _title_case_genre(name: str) -> str:
    return " ".join(w.capitalize() if w.islower() else w for w in name.strip().split())


def _is_valid_genre(name: str) -> bool:
    n = name.strip()
    if len(n) < 3 or len(n) > 32:
        return False
    lower = n.lower()
    if re.match(r"^\d{4}$", lower):
        return False
    if re.search(r"\bwochen\b|me \d", lower):
        return False
    if lower in {
        "english",
        "german",
        "france",
        "ireland",
        "finland",
        "compilation",
        "cd extra",
        "laut.de",
        "plattentests.de",
        "alternative",
        "rock pop",
        "club/dance",
    }:
        return False
    if lower.startswith("ph_") or lower.startswith("exchange e"):
        return False
    return True


def _pick_genres(data: dict) -> list[str]:
    scored: list[tuple[int, str]] = []
    for key in ("genres", "tags"):
        for item in data.get(key) or []:
            name = (item.get("name") or "").strip()
            if not _is_valid_genre(name):
                continue
            count = int(item.get("count") or 1)
            scored.append((count, _title_case_genre(name)))
    seen: set[str] = set()
    out: list[str] = []
    for _, name in sorted(scored, key=lambda x: (-x[0], x[1].lower())):
        key = name.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(name)
        if len(out) >= MAX_GENRES:
            break
    return out


def lookup_metadata(artist: str, title: str, year: int | None = None) -> tuple[str | None, list[str]]:
    """Return (release_type, genre_tags) or (None, []) if not found."""
    artist = artist.strip()
    title = title.strip()
    if not artist or not title:
        return None, []

    query = f'artist:"{_escape_query(artist)}" AND release:"{_escape_query(title)}"'
    if year:
        query += f" AND date:{year}"
    url = (
        "https://musicbrainz.org/ws/2/release/?"
        + urllib.parse.urlencode({"query": query, "fmt": "json", "limit": 5})
    )
    data = _get_json(url)
    if not data:
        return None, []

    releases = data.get("releases") or []
    if not releases:
        if year:
            return lookup_metadata(artist, title, None)
        return None, []

    release = releases[0]
    rg = release.get("release-group") or {}
    rg_id = rg.get("id")
    primary = rg.get("primary-type") or release.get("primary-type")
    secondaries = rg.get("secondary-types") or release.get("secondary-types") or []

    release_type = normalize_release_type(map_musicbrainz_type(primary, secondaries))
    if release_type and release_type not in RELEASE_TYPES:
        release_type = None

    genres: list[str] = []
    if rg_id:
        rg_url = f"https://musicbrainz.org/ws/2/release-group/{rg_id}?inc=genres+tags&fmt=json"
        rg_data = _get_json(rg_url)
        if rg_data:
            genres = _pick_genres(rg_data)

    if not genres:
        genres = _pick_genres(rg)

    return release_type, genres
