from fastapi import FastAPI
from app.api.v1.api import api_router

app = FastAPI(
    title="YOLO-AUTO API",
    description="Backend services for the YOLO-AUTO platform.",
    version="0.1.0",
    openapi_url="/api/v1/openapi.json"
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/")
def read_root():
    return {"message": "Welcome to YOLO-AUTO Backend"}
