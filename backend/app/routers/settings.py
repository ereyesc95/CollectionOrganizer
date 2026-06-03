from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.animations import get_animations_folder
from app.autographs import get_autographs_folder
from app.covers import get_covers_folder
from app.database import get_db
from app.folder_dialog import pick_folder
from app.schemas import BrowseResult, SettingsOut, SettingsUpdate, SourceFolderBrowseResult
from app.media_lookup import invalidate_media_lookup_cache
from app.source_folders import get_source_root, set_source_root

router = APIRouter(prefix="/api/settings", tags=["settings"])


def _settings_out(db: Session) -> SettingsOut:
    root = get_source_root(db)
    covers = get_covers_folder(db)
    animations = get_animations_folder(db)
    autographs = get_autographs_folder(db)
    return SettingsOut(
        source_folder=str(root) if root else "",
        covers_folder=str(covers) if covers else "",
        animations_folder=str(animations) if animations else "",
        autographs_folder=str(autographs) if autographs else "",
    )


@router.get("", response_model=SettingsOut)
def get_settings(db: Session = Depends(get_db)):
    return _settings_out(db)


@router.put("", response_model=SettingsOut)
def update_settings(data: SettingsUpdate, db: Session = Depends(get_db)):
    if data.source_folder is not None:
        missing = set_source_root(db, data.source_folder)
        if missing:
            raise HTTPException(
                400,
                f"Missing subfolders: {', '.join(missing)}",
            )
        invalidate_media_lookup_cache()
    return _settings_out(db)


@router.post("/browse-source-folder", response_model=SourceFolderBrowseResult)
def browse_source_folder(db: Session = Depends(get_db)):
    current = get_source_root(db)
    initial = str(current) if current else ""
    chosen = pick_folder(initial)
    if not chosen:
        return SourceFolderBrowseResult(path=initial, selected=False)
    missing = set_source_root(db, chosen)
    if missing:
        return SourceFolderBrowseResult(
            path=chosen,
            selected=False,
            missing_subfolders=missing,
        )
    return SourceFolderBrowseResult(path=chosen, selected=True)


# Legacy browse endpoints (still work when source root is not set)
@router.post("/browse-covers-folder", response_model=BrowseResult)
def browse_covers_folder(db: Session = Depends(get_db)):
    from app.covers import set_covers_folder

    current = get_covers_folder(db)
    initial = str(current) if current else ""
    chosen = pick_folder(initial)
    if not chosen:
        return BrowseResult(path=initial, selected=False)
    set_covers_folder(db, chosen)
    invalidate_media_lookup_cache()
    return BrowseResult(path=chosen, selected=True)


@router.post("/browse-animations-folder", response_model=BrowseResult)
def browse_animations_folder(db: Session = Depends(get_db)):
    from app.animations import set_animations_folder

    current = get_animations_folder(db)
    initial = str(current) if current else ""
    chosen = pick_folder(initial)
    if not chosen:
        return BrowseResult(path=initial, selected=False)
    set_animations_folder(db, chosen)
    invalidate_media_lookup_cache()
    return BrowseResult(path=chosen, selected=True)


@router.post("/browse-autographs-folder", response_model=BrowseResult)
def browse_autographs_folder(db: Session = Depends(get_db)):
    from app.autographs import set_autographs_folder

    current = get_autographs_folder(db)
    initial = str(current) if current else ""
    chosen = pick_folder(initial)
    if not chosen:
        return BrowseResult(path=initial, selected=False)
    set_autographs_folder(db, chosen)
    invalidate_media_lookup_cache()
    return BrowseResult(path=chosen, selected=True)
