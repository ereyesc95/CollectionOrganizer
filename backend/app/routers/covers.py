from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.media_lookup import cached_cover_path
from app.media_response import cached_media_file
from app.models import Record

router = APIRouter(prefix="/api/covers", tags=["covers"])


@router.get("/{record_id}")
def serve_cover(record_id: int, db: Session = Depends(get_db)):
    record = db.get(Record, record_id)
    if not record:
        raise HTTPException(404, "Record not found")
    path = cached_cover_path(db, record.cover_key)
    if not path:
        raise HTTPException(404, "Cover not found")
    return cached_media_file(path)
