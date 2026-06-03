"""Resolve and list audio tracks under Source/Audio."""

from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy.orm import Session

from app.media_find import IMAGE_EXTENSIONS
from app.models import Record
from app.source_folders import get_subfolder

SUB_AUDIO = "Audio"

AUDIO_EXTENSIONS = (".mp3", ".flac", ".wav", ".m4a", ".aac", ".ogg", ".opus")
IGNORE_DIR_NAMES = {"[artwork]"}
DISC_PREFIX_RE = re.compile(r"^disc\s+\d+", re.IGNORECASE)
TRACK_NUM_RE = re.compile(r"^(\d{1,3})[\s._\-–—]+(.+)$")


@dataclass(frozen=True)
class AudioTrack:
    index: int
    track_number: str | None
    title: str
    disc: str | None
    path: Path


def get_audio_folder(db: Session) -> Path | None:
    return get_subfolder(db, SUB_AUDIO)


@dataclass(frozen=True)
class ArtworkImage:
    index: int
    title: str
    path: Path


def audio_url_for(record_id: int, track_index: int) -> str:
    return f"/api/audio/{record_id}/file/{track_index}"


def artwork_url_for(record_id: int, image_index: int) -> str:
    return f"/api/audio/{record_id}/artwork/{image_index}"


def _norm(s: str) -> str:
    return s.strip().casefold()


def _is_ignored_dir(name: str) -> bool:
    return _norm(name) in IGNORE_DIR_NAMES


def _is_disc_dir(name: str) -> bool:
    return bool(DISC_PREFIX_RE.match(name.strip()))


def find_named_dir(parent: Path, name: str) -> Path | None:
    if not parent.is_dir():
        return None
    target = _norm(name)
    exact = parent / name
    if exact.is_dir():
        return exact
    for child in parent.iterdir():
        if child.is_dir() and _norm(child.name) == target:
            return child
    return None


def _album_matches(dir_name: str, title: str) -> bool:
    t = _norm(title)
    n = _norm(dir_name)
    if n == t:
        return True
    if n.endswith(f". {t}"):
        return True
    if f". {t}" in n:
        return True
    return False


def find_album_dir(artist_dir: Path, title: str) -> Path | None:
    matches: list[Path] = []
    for child in artist_dir.iterdir():
        if child.is_dir() and _album_matches(child.name, title):
            matches.append(child)
    if not matches:
        return None
    if len(matches) == 1:
        return matches[0]
    return sorted(matches, key=lambda p: p.name.lower())[0]


def _edition_matches(dir_name: str, record: Record) -> bool:
    et = (record.edition_title or "").strip()
    if et:
        return _norm(et) in _norm(dir_name)
    if record.edition_year is None:
        return "standard" in _norm(dir_name)
    year = str(record.edition_year)
    return year in dir_name and "standard" in _norm(dir_name)


def _edition_subdirs(album_dir: Path) -> list[Path]:
    out: list[Path] = []
    for child in album_dir.iterdir():
        if not child.is_dir() or _is_ignored_dir(child.name) or _is_disc_dir(child.name):
            continue
        out.append(child)
    return sorted(out, key=lambda p: p.name.lower())


def _dir_has_audio_files(path: Path) -> bool:
    for f in path.iterdir():
        if f.is_file() and f.suffix.lower() in AUDIO_EXTENSIONS:
            return True
    return False


def resolve_track_root(album_dir: Path, record: Record) -> Path:
    edition_dirs = _edition_subdirs(album_dir)
    if _dir_has_audio_files(album_dir):
        return album_dir
    if not edition_dirs:
        return album_dir
    et = (record.edition_title or "").strip()
    if et or record.edition_year is not None:
        for d in edition_dirs:
            if _edition_matches(d.name, record):
                return d
    if len(edition_dirs) == 1:
        return edition_dirs[0]
    if not et and record.edition_year is None:
        for d in edition_dirs:
            if "standard" in _norm(d.name):
                return d
    return album_dir


def _track_from_filename(path: Path) -> tuple[str | None, str]:
    stem = path.stem.strip()
    m = TRACK_NUM_RE.match(stem)
    if m:
        return m.group(1), m.group(2).strip() or stem
    m2 = re.match(r"^(\d{1,3})(?:[.\s_\-–—]+)(.+)$", stem)
    if m2:
        return m2.group(1), m2.group(2).strip() or stem
    m3 = re.match(r"^(\d{1,3})$", stem)
    if m3:
        return m3.group(1), stem
    return None, stem


def _disc_sort_key(disc: str | None) -> tuple[int, str]:
    if not disc:
        return (0, "")
    m = re.search(r"(\d+)", disc)
    return (int(m.group(1)) if m else 999, disc.lower())


def _track_sort_key(path: Path) -> tuple:
    stem = path.stem
    m = re.match(r"^(\d+)", stem)
    num = int(m.group(1)) if m else 9999
    return (num, stem.lower())


def _collect_audio_files(root: Path, disc: str | None, out: list[tuple[str | None, Path]]) -> None:
    for entry in sorted(root.iterdir(), key=lambda p: p.name.lower()):
        if entry.is_dir():
            if _is_ignored_dir(entry.name):
                continue
            if _is_disc_dir(entry.name):
                _collect_audio_files(entry, entry.name, out)
            else:
                _collect_audio_files(entry, disc or entry.name, out)
        elif entry.is_file() and entry.suffix.lower() in AUDIO_EXTENSIONS:
            out.append((disc, entry))


def resolve_record_audio_root(db: Session, record: Record) -> Path | None:
    audio_root = get_audio_folder(db)
    if not audio_root:
        return None
    artist_dir = find_named_dir(audio_root, record.artist)
    if not artist_dir:
        return None
    album_dir = find_album_dir(artist_dir, record.title)
    if not album_dir:
        return None
    return resolve_track_root(album_dir, record)


def list_audio_tracks(db: Session, record: Record) -> list[AudioTrack]:
    track_root = resolve_record_audio_root(db, record)
    if not track_root:
        return []
    raw: list[tuple[str | None, Path]] = []
    _collect_audio_files(track_root, None, raw)
    raw.sort(key=lambda item: (_disc_sort_key(item[0]), _track_sort_key(item[1])))
    tracks: list[AudioTrack] = []
    for i, (disc, path) in enumerate(raw):
        track_number, title = _track_from_filename(path)
        tracks.append(
            AudioTrack(
                index=i,
                track_number=track_number,
                title=title,
                disc=disc,
                path=path,
            )
        )
    return tracks


def find_track_path(db: Session, record: Record, track_index: int) -> Path | None:
    tracks = list_audio_tracks(db, record)
    if track_index < 0 or track_index >= len(tracks):
        return None
    return tracks[track_index].path


def list_artwork(db: Session, record: Record) -> list[ArtworkImage]:
    track_root = resolve_record_audio_root(db, record)
    if not track_root:
        return []
    artwork_dir = find_named_dir(track_root, "[Artwork]")
    if not artwork_dir or not artwork_dir.is_dir():
        return []
    images: list[ArtworkImage] = []
    for f in sorted(artwork_dir.iterdir(), key=lambda p: p.name.lower()):
        if f.is_file() and f.suffix.lower() in IMAGE_EXTENSIONS:
            images.append(ArtworkImage(index=len(images), title=f.stem, path=f))
    return images


def find_artwork_path(db: Session, record: Record, image_index: int) -> Path | None:
    images = list_artwork(db, record)
    if image_index < 0 or image_index >= len(images):
        return None
    return images[image_index].path
