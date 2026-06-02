from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.animations import get_animations_folder, set_animations_folder
from app.autographs import get_autographs_folder, set_autographs_folder
from app.covers import get_covers_folder, set_covers_folder
from app.database import get_db
from app.folder_dialog import pick_folder
from app.schemas import SettingsOut, SettingsUpdate

router = APIRouter(prefix="/api/settings", tags=["settings"])


class BrowseResult(BaseModel):
    path: str
    selected: bool = False


def _settings_out(db: Session) -> SettingsOut:
    covers = get_covers_folder(db)
    animations = get_animations_folder(db)
    autographs = get_autographs_folder(db)
    return SettingsOut(
        covers_folder=str(covers) if covers else "",
        animations_folder=str(animations) if animations else "",
        autographs_folder=str(autographs) if autographs else "",
    )


@router.get("", response_model=SettingsOut)
def get_settings(db: Session = Depends(get_db)):
    return _settings_out(db)


@router.put("", response_model=SettingsOut)
def update_settings(data: SettingsUpdate, db: Session = Depends(get_db)):
    if data.covers_folder is not None:
        set_covers_folder(db, data.covers_folder)
    if data.animations_folder is not None:
        set_animations_folder(db, data.animations_folder)
    if data.autographs_folder is not None:
        set_autographs_folder(db, data.autographs_folder)
    return _settings_out(db)


@router.post("/browse-covers-folder", response_model=BrowseResult)
def browse_covers_folder(db: Session = Depends(get_db)):
    current = get_covers_folder(db)
    initial = str(current) if current else ""
    chosen = pick_folder(initial)
    if not chosen:
        return BrowseResult(path=initial, selected=False)
    set_covers_folder(db, chosen)
    return BrowseResult(path=chosen, selected=True)


@router.post("/browse-animations-folder", response_model=BrowseResult)
def browse_animations_folder(db: Session = Depends(get_db)):
    current = get_animations_folder(db)
    initial = str(current) if current else ""
    chosen = pick_folder(initial)
    if not chosen:
        return BrowseResult(path=initial, selected=False)
    set_animations_folder(db, chosen)
    return BrowseResult(path=chosen, selected=True)


@router.post("/browse-autographs-folder", response_model=BrowseResult)
def browse_autographs_folder(db: Session = Depends(get_db)):
    current = get_autographs_folder(db)
    initial = str(current) if current else ""
    chosen = pick_folder(initial)
    if not chosen:
        return BrowseResult(path=initial, selected=False)
    set_autographs_folder(db, chosen)
    return BrowseResult(path=chosen, selected=True)
