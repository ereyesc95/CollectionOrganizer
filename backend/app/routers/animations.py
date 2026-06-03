from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.media_lookup import cached_animation_path
from app.media_response import cached_media_file
from app.models import Record

router = APIRouter(prefix="/api/animations", tags=["animations"])


@router.get("/{record_id}")
def serve_animation(
    record_id: int,
    index: int = Query(1, ge=1),
    db: Session = Depends(get_db),
):
    record = db.get(Record, record_id)
    if not record:
        raise HTTPException(404, "Record not found")
    path = cached_animation_path(db, record.cover_key, index=index)
    if not path:
        raise HTTPException(404, "Animation not found")
    return cached_media_file(path)
