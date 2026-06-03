#!/usr/bin/env python3
"""Start Collection Organizer API (and optionally open the UI)."""
from __future__ import annotations

import argparse
import subprocess
import sys
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent
BACKEND = ROOT / "backend"


def ensure_deps() -> None:
    try:
        import uvicorn  # noqa: F401
    except ImportError:
        subprocess.check_call(
            [sys.executable, "-m", "pip", "install", "-r", str(BACKEND / "requirements.txt")]
        )


def run_import() -> None:
    sys.path.insert(0, str(BACKEND))
    from app.database import SessionLocal, init_db
    from app.import_excel import import_from_xlsx
    from app.paths import default_xlsx_path

    xlsx = default_xlsx_path()
    if not xlsx:
        print("Collection.xlsx not found")
        return
    init_db()
    db = SessionLocal()
    try:
        result = import_from_xlsx(db, xlsx, replace=False)
        print(
            f"Import done: {result.imported} new, {result.updated} updated, "
            f"{result.skipped} skipped"
        )
        if result.errors:
            print("Errors:", result.errors[:5])
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="RecordStack")
    parser.add_argument("--import-only", action="store_true", help="Import Excel and exit")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args()

    ensure_deps()

    if args.import_only:
        run_import()
        return

    if not (ROOT / "data" / "collection.db").exists():
        print("First run: importing Collection.xlsx …")
        run_import()

    sys.path.insert(0, str(BACKEND))
    from app.local_host import app_url

    if (ROOT / "frontend" / "dist").is_dir():
        open_url = app_url(args.port)
        print(f"RecordStack: {open_url}")
    else:
        open_url = "http://localhost:5173/"
        print("Dev UI: run in another terminal: cd frontend && npm install && npm run dev")

    if not args.no_browser:
        webbrowser.open(open_url)

    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=args.port, reload=False, app_dir=str(BACKEND))


if __name__ == "__main__":
    main()
