from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.covers import find_cover_path, get_covers_folder
from app.database import get_db
from app.models import Record

router = APIRouter(prefix="/api/covers", tags=["covers"])


@router.get("/{record_id}")
def serve_cover(record_id: int, db: Session = Depends(get_db)):
    record = db.get(Record, record_id)
    if not record:
        raise HTTPException(404, "Record not found")
    folder = get_covers_folder(db)
    path = find_cover_path(folder, record.cover_key)
    if not path:
        raise HTTPException(404, "Cover not found")
    return FileResponse(path)
