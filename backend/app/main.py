from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.local_host import app_url
from app.frontend_static import mount_frontend
from app.paths import resolve_frontend_dist
from app.database import init_db
from app.routers import (
    animations,
    audio,
    autographs,
    canvas,
    cards,
    covers,
    import_router,
    records,
    settings as settings_router,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="RecordStack", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins
    + [
        app_url(8000).rstrip("/"),
        app_url(8765).rstrip("/"),
        app_url(8766).rstrip("/"),
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:8765",
        "http://127.0.0.1:8765",
        "http://localhost:8766",
        "http://127.0.0.1:8766",
        "http://recordstack.localhost:8000",
        "http://recordstack.localhost:8765",
        "http://recordstack.localhost:8766",
        "http://recordstack.local:8000",
        "http://recordstack.local:8765",
        "http://recordstack.local:8766",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(records.router)
app.include_router(settings_router.router)
app.include_router(import_router.router)
app.include_router(covers.router)
app.include_router(animations.router)
app.include_router(autographs.router)
app.include_router(canvas.router)
app.include_router(cards.router)
app.include_router(audio.router)

@app.get("/api/health")
def health():
    dist = resolve_frontend_dist()
    return {
        "status": "ok",
        "frontend": dist is not None,
        "frontend_path": str(dist) if dist else None,
    }


_dist = resolve_frontend_dist()
if _dist:
    mount_frontend(app, _dist)
