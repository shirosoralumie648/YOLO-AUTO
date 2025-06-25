from fastapi import APIRouter

from app.api.v1.endpoints import yolo_versions, yolo_modules

api_router = APIRouter()
api_router.include_router(yolo_versions.router, prefix="/yolo-versions", tags=["yolo-versions"])
api_router.include_router(yolo_modules.router, prefix="/yolo-modules", tags=["yolo-modules"])
