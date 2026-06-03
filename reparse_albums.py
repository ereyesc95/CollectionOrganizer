"""Re-apply parse_album() to every record from its cover_key (fixes edition grouping)."""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT / "backend"))

from app.database import SessionLocal
from app.models import Record
from app.parse_album import parse_album


def main() -> None:
    db = SessionLocal()
    try:
        updated = 0
        for record in db.query(Record).all():
            parsed = parse_album(record.cover_key)
            changed = (
                record.artist != parsed.artist
                or record.record_year != parsed.record_year
                or record.title != parsed.title
                or record.edition_year != parsed.edition_year
                or record.edition_title != parsed.edition_title
            )
            if changed:
                record.artist = parsed.artist
                record.record_year = parsed.record_year
                record.title = parsed.title
                record.edition_year = parsed.edition_year
                record.edition_title = parsed.edition_title
                updated += 1
        db.commit()
        print(f"Updated {updated} record(s).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
