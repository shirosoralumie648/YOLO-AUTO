from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.api import deps

router = APIRouter()


@router.post("/", response_model=schemas.YoloModule)
def create_yolo_module(
    *, 
    db: Session = Depends(deps.get_db),
    yolo_module_in: schemas.YoloModuleCreate
):
    """
    Create new YOLO module.
    """
    yolo_module = crud.yolo_module.create(db=db, obj_in=yolo_module_in)
    return yolo_module


@router.get("/", response_model=List[schemas.YoloModule])
def read_yolo_modules(
    db: Session = Depends(deps.get_db),
    skip: int = 0,
    limit: int = 100,
):
    """
    Retrieve YOLO modules.
    """
    yolo_modules = crud.yolo_module.get_multi(db, skip=skip, limit=limit)
    return yolo_modules


@router.put("/{id}", response_model=schemas.YoloModule)
def update_yolo_module(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
    yolo_module_in: schemas.YoloModuleUpdate,
):
    """
    Update a YOLO module.
    """
    yolo_module = crud.yolo_module.get(db=db, id=id)
    if not yolo_module:
        raise HTTPException(status_code=404, detail="YOLO module not found")
    yolo_module = crud.yolo_module.update(db=db, db_obj=yolo_module, obj_in=yolo_module_in)
    return yolo_module


@router.delete("/{id}", response_model=schemas.YoloModule)
def delete_yolo_module(
    *,
    db: Session = Depends(deps.get_db),
    id: int,
):
    """
    Delete a YOLO module.
    """
    yolo_module = crud.yolo_module.get(db=db, id=id)
    if not yolo_module:
        raise HTTPException(status_code=404, detail="YOLO module not found")
    yolo_module = crud.yolo_module.remove(db=db, id=id)
    return yolo_module
