from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.canvas_files import find_canvas_path
from app.database import get_db
from app.media_response import cached_media_file
from app.models import Record

router = APIRouter(prefix="/api/canvas", tags=["canvas"])


@router.get("/{record_id}")
def serve_canvas(
    record_id: int,
    index: int = Query(1, ge=1),
    db: Session = Depends(get_db),
):
    record = db.get(Record, record_id)
    if not record:
        raise HTTPException(404, "Record not found")
    path = find_canvas_path(db, record.cover_key, index=index)
    if not path:
        raise HTTPException(404, "Canvas not found")
    return cached_media_file(path)
