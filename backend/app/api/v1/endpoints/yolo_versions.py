from typing import Any, List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps

router = APIRouter()


@router.get("/", response_model=List[schemas.YoloVersion])
def read_yolo_versions(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
) -> Any:
    """
    Retrieve YOLO versions.
    """
    yolo_versions = crud.yolo_version.get_multi(db, skip=skip, limit=limit)
    return yolo_versions


@router.post("/", response_model=schemas.YoloVersion)
def create_yolo_version(
    *, 
    db: Session = Depends(deps.get_db), 
    yolo_version_in: schemas.YoloVersionCreate
) -> Any:
    """
    Create new YOLO version.
    """
    yolo_version = crud.yolo_version.get_by_name(db, name=yolo_version_in.name)
    if yolo_version:
        raise HTTPException(
            status_code=400,
            detail="A YOLO version with this name already exists in the system.",
        )
    yolo_version = crud.yolo_version.create(db=db, obj_in=yolo_version_in)
    return yolo_version


@router.get("/{id}", response_model=schemas.YoloVersion)
def read_yolo_version(
    *, 
    db: Session = Depends(deps.get_db), 
    id: int
) -> Any:
    """
    Get YOLO version by ID.
    """
    yolo_version = crud.yolo_version.get(db=db, id=id)
    if not yolo_version:
        raise HTTPException(status_code=404, detail="YOLO version not found")
    return yolo_version


@router.put("/{id}", response_model=schemas.YoloVersion)
def update_yolo_version(
    *, 
    db: Session = Depends(deps.get_db), 
    id: int, 
    yolo_version_in: schemas.YoloVersionUpdate
) -> Any:
    """
    Update a YOLO version.
    """
    yolo_version = crud.yolo_version.get(db=db, id=id)
    if not yolo_version:
        raise HTTPException(status_code=404, detail="YOLO version not found")
    yolo_version = crud.yolo_version.update(db=db, db_obj=yolo_version, obj_in=yolo_version_in)
    return yolo_version


@router.delete("/{id}", response_model=schemas.YoloVersion)
def delete_yolo_version(
    *, 
    db: Session = Depends(deps.get_db), 
    id: int
) -> Any:
    """
    Delete a YOLO version.
    """
    yolo_version = crud.yolo_version.get(db=db, id=id)
    if not yolo_version:
        raise HTTPException(status_code=404, detail="YOLO version not found")
    yolo_version = crud.yolo_version.remove(db=db, id=id)
    return yolo_version
