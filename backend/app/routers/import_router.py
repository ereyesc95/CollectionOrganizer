from pathlib import Path

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.paths import default_xlsx_path
from app.database import get_db
from app.import_excel import import_from_xlsx
from app.schemas import ImportResult

router = APIRouter(prefix="/api/import", tags=["import"])


@router.post("/excel", response_model=ImportResult)
def import_excel(
    db: Session = Depends(get_db),
    replace: bool = Query(False),
    path: str = Query(""),
):
    if path:
        xlsx = Path(path)
    else:
        found = default_xlsx_path()
        if not found:
            return ImportResult(
                imported=0,
                updated=0,
                skipped=0,
                errors=["Collection.xlsx not found"],
            )
        xlsx = found
    if not xlsx.is_file():
        return ImportResult(
            imported=0, updated=0, skipped=0, errors=[f"File not found: {xlsx}"]
        )
    try:
        return import_from_xlsx(db, xlsx, replace=replace)
    except Exception as e:
        db.rollback()
        return ImportResult(
            imported=0, updated=0, skipped=0, errors=[str(e)]
        )
