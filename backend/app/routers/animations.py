from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.animations import find_animation_path, get_animations_folder
from app.media_response import cached_media_file
from app.database import get_db
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
    folder = get_animations_folder(db)
    path = find_animation_path(folder, record.cover_key, index=index)
    if not path:
        raise HTTPException(404, "Animation not found")
    return cached_media_file(path)
