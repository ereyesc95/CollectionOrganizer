#!/usr/bin/env python3
"""
SleeveStack desktop entry point (also used by PyInstaller).
Starts the local API and opens the app in your default browser.
"""
from __future__ import annotations

import socket
import sys
import threading
import time
import webbrowser
from pathlib import Path

# Backend package must be on path before app imports
BACKEND = Path(__file__).resolve().parent / "backend"
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))


def find_free_port(preferred: int = 8765) -> int:
    for port in (preferred, preferred + 1, preferred + 2, 8766, 8767, 8770):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("0.0.0.0", port))
                return port
            except OSError:
                continue
    return preferred


def get_lan_ip() -> str | None:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except OSError:
        return None


def first_run_import() -> None:
    from app.database import SessionLocal, init_db
    from app.import_excel import import_from_xlsx
    from app.paths import database_file, default_xlsx_path

    db_file = database_file()
    if db_file.exists():
        return
    xlsx = default_xlsx_path()
    if not xlsx:
        return
    init_db()
    db = SessionLocal()
    try:
        import_from_xlsx(db, xlsx, replace=False)
        db.commit()
    finally:
        db.close()


def write_phone_access_hint(port: int) -> None:
    from app.local_host import app_url
    from app.paths import DATA_DIR, ensure_data_dir

    ensure_data_dir()
    ip = get_lan_ip()
    lines = [
        "SleeveStack — open on your phone (same Wi-Fi)",
        "",
        f"On this PC:  {app_url(port)}",
    ]
    if ip:
        lines.append(f"On your phone: http://{ip}:{port}/")
    else:
        lines.append("On your phone: use this PC's local IP address with the port above.")
    lines.extend(
        [
            "",
            "See PHONE_ACCESS.txt in the app folder for more help.",
        ]
    )
    (DATA_DIR / "phone-access.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")


def open_browser(port: int) -> None:
    from app.local_host import app_url

    time.sleep(2.0)
    webbrowser.open(app_url(port))


def main() -> None:
    from app.paths import resolve_frontend_dist

    port = find_free_port()
    first_run_import()
    write_phone_access_hint(port)

    if not resolve_frontend_dist():
        from app.paths import DATA_DIR, ensure_data_dir

        ensure_data_dir()
        (DATA_DIR / "startup-error.txt").write_text(
            "SleeveStack could not find the built UI (frontend/dist).\n"
            "Re-run build.ps1 or reinstall from a complete dist\\SleeveStack folder.\n",
            encoding="utf-8",
        )

    threading.Thread(target=open_browser, args=(port,), daemon=True).start()

    import uvicorn
    from app.main import app

    # log_config=None avoids uvicorn's default logging setup, which breaks under PyInstaller
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=port,
        log_level="warning",
        log_config=None,
        access_log=False,
    )


if __name__ == "__main__":
    main()
