from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.autographs import (
    delete_autograph,
    find_autograph_path,
    get_autographs_folder,
    import_autograph_from_path,
    save_autograph,
)
from app.database import get_db
from app.folder_dialog import pick_image_file
from app.media_lookup import cached_autograph_path, get_media_lookup
from app.media_response import cached_media_file
from app.models import Record

router = APIRouter(prefix="/api/autographs", tags=["autographs"])


@router.get("/{record_id}")
def serve_autograph(record_id: int, db: Session = Depends(get_db)):
    record = db.get(Record, record_id)
    if not record:
        raise HTTPException(404, "Record not found")
    path = cached_autograph_path(db, record_id, record.cover_key)
    if not path:
        raise HTTPException(404, "Autograph photo not found")
    return cached_media_file(path)


@router.post("/{record_id}")
async def upload_autograph(
    record_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if not db.get(Record, record_id):
        raise HTTPException(404, "Record not found")
    content = await file.read()
    if not content:
        raise HTTPException(400, "Empty file")
    if len(content) > 15 * 1024 * 1024:
        raise HTTPException(400, "File too large (max 15MB)")
    save_autograph(record_id, file.filename or "photo.jpg", content)
    return {"ok": True}


@router.delete("/{record_id}", status_code=204)
def remove_autograph(record_id: int, db: Session = Depends(get_db)):
    if not db.get(Record, record_id):
        raise HTTPException(404, "Record not found")
    delete_autograph(record_id)


@router.post("/{record_id}/browse-file")
def browse_autograph_file(record_id: int, db: Session = Depends(get_db)):
    record = db.get(Record, record_id)
    if not record:
        raise HTTPException(404, "Record not found")
    folder = get_autographs_folder(db)
    initial = str(folder) if folder else ""
    chosen = pick_image_file(initial)
    path_before, _ = find_autograph_path(
        db, record_id, record.cover_key, lookup=get_media_lookup(db)
    )
    if not chosen:
        return {
            "selected": False,
            "has_photo": path_before is not None,
        }
    try:
        import_autograph_from_path(db, record_id, record.cover_key, Path(chosen))
    except (FileNotFoundError, ValueError) as e:
        raise HTTPException(400, str(e)) from e
    path_after, source = find_autograph_path(
        db, record_id, record.cover_key, lookup=get_media_lookup(db)
    )
    return {
        "selected": True,
        "has_photo": path_after is not None,
        "source": source,
    }
