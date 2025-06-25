from fastapi import FastAPI

app = FastAPI(
    title="YOLO-AUTO API",
    description="Backend services for the YOLO-AUTO platform.",
    version="0.1.0",
)

@app.get("/")
def read_root():
    return {"message": "Welcome to YOLO-AUTO API"}
