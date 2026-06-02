# -*- mode: python ; coding: utf-8 -*-
# PyInstaller spec for SleeveStack — run: pyinstaller SleeveStack.spec

import sys
from pathlib import Path

block_cipher = None
root = Path(SPECPATH)

backend = root / "backend"
datas = [
    (str(root / "frontend" / "dist"), "frontend/dist"),
]
xlsx = root / "Collection.xlsx"
if xlsx.is_file():
    datas.append((str(xlsx), "."))

hiddenimports = [
    "uvicorn",
    "uvicorn.logging",
    "uvicorn.loops",
    "uvicorn.loops.auto",
    "uvicorn.protocols",
    "uvicorn.protocols.http",
    "uvicorn.protocols.http.auto",
    "uvicorn.protocols.websockets",
    "uvicorn.protocols.websockets.auto",
    "uvicorn.lifespan",
    "uvicorn.lifespan.on",
    "fastapi",
    "starlette",
    "starlette.routing",
    "starlette.staticfiles",
    "sqlalchemy",
    "sqlalchemy.sql.default_comparator",
    "pydantic",
    "pydantic_settings",
    "openpyxl",
    "multipart",
    "tkinter",
    "app",
    "app.main",
    "app.config",
    "app.paths",
    "app.database",
    "app.models",
    "app.crud",
    "app.schemas",
    "app.parse_album",
    "app.covers",
    "app.animations",
    "app.autographs",
    "app.import_excel",
    "app.folder_dialog",
    "app.routers.records",
    "app.routers.settings",
    "app.routers.import_router",
    "app.routers.covers",
    "app.routers.animations",
    "app.routers.autographs",
]

pathex = [str(backend)]

a = Analysis(
    [str(root / "desktop_launcher.py")],
    pathex=pathex,
    binaries=[],
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name="SleeveStack",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=str(root / "assets" / "SleeveStack.ico") if (root / "assets" / "SleeveStack.ico").exists() else None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name="SleeveStack",
)
