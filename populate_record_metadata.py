#!/usr/bin/env python3
"""Fill blank release_type and genre_tags from MusicBrainz (only empty fields)."""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.crud import _set_tags
from app.database import SessionLocal, init_db
from app.models import Record, RecordGenreTag
from app.musicbrainz_enrich import lookup_metadata
from app.release_types import normalize_release_type


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    parser = argparse.ArgumentParser(description="Enrich records from MusicBrainz")
    parser.add_argument("--limit", type=int, default=0, help="Max records to process (0 = all)")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    init_db()
    db = SessionLocal()
    try:
        records = db.scalars(
            select(Record).options(selectinload(Record.genre_tags)).order_by(Record.id)
        ).all()
        processed = 0
        updated = 0
        for record in records:
            need_type = not record.release_type
            need_genre = not record.genre_tags
            if not need_type and not need_genre:
                continue
            if args.limit and processed >= args.limit:
                break
            processed += 1
            year = record.edition_year or record.record_year
            rtype, genres = lookup_metadata(record.artist, record.title, year)
            changed = False
            if need_type and rtype:
                norm = normalize_release_type(rtype)
                if norm:
                    print(f"  [{record.id}] type: {record.artist} - {record.title} -> {norm}")
                    if not args.dry_run:
                        record.release_type = norm
                    changed = True
            if need_genre and genres:
                print(f"  [{record.id}] genre: {record.artist} - {record.title} -> {', '.join(genres)}")
                if not args.dry_run:
                    _set_tags(db, record, RecordGenreTag, "genre_tags", genres)
                changed = True
            if changed:
                updated += 1
                if not args.dry_run:
                    db.commit()
        print(f"Done: processed {processed}, updated {updated}" + (" (dry run)" if args.dry_run else ""))
    finally:
        db.close()


if __name__ == "__main__":
    main()
