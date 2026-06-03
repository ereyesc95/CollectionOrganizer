from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.audio_files import (
    artwork_url_for,
    audio_url_for,
    find_artwork_path,
    find_track_path,
    list_artwork,
    list_audio_tracks,
)
from app.database import get_db
from app.media_response import cached_media_file
from app.models import Record
from app.schemas import ArtworkImageOut, ArtworkListOut, AudioTrackOut, AudioTracksOut

router = APIRouter(prefix="/api/audio", tags=["audio"])


@router.get("/{record_id}/tracks", response_model=AudioTracksOut)
def get_tracks(record_id: int, db: Session = Depends(get_db)):
    record = db.get(Record, record_id)
    if not record:
        raise HTTPException(404, "Record not found")
    tracks = list_audio_tracks(db, record)
    return AudioTracksOut(
        tracks=[
            AudioTrackOut(
                index=t.index,
                track_number=t.track_number,
                title=t.title,
                disc=t.disc,
                url=audio_url_for(record_id, t.index),
            )
            for t in tracks
        ]
    )


@router.get("/{record_id}/artwork", response_model=ArtworkListOut)
def get_artwork(record_id: int, db: Session = Depends(get_db)):
    record = db.get(Record, record_id)
    if not record:
        raise HTTPException(404, "Record not found")
    images = list_artwork(db, record)
    return ArtworkListOut(
        images=[
            ArtworkImageOut(
                index=img.index,
                title=img.title,
                url=artwork_url_for(record_id, img.index),
            )
            for img in images
        ]
    )


@router.get("/{record_id}/artwork/{image_index}")
def serve_artwork(record_id: int, image_index: int, db: Session = Depends(get_db)):
    record = db.get(Record, record_id)
    if not record:
        raise HTTPException(404, "Record not found")
    path = find_artwork_path(db, record, image_index)
    if not path:
        raise HTTPException(404, "Artwork not found")
    return cached_media_file(path)


@router.get("/{record_id}/file/{track_index}")
def serve_track(record_id: int, track_index: int, db: Session = Depends(get_db)):
    record = db.get(Record, record_id)
    if not record:
        raise HTTPException(404, "Record not found")
    path = find_track_path(db, record, track_index)
    if not path:
        raise HTTPException(404, "Track not found")
    return cached_media_file(path)
