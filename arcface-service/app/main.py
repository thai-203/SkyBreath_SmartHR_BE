import logging
from typing import List

from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.face_service import face_service
from app.model_manager import model_manager

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

app = FastAPI(title="ArcFace AI Worker")


@app.on_event("startup")
async def startup_event():
    await model_manager.initialize()


@app.get("/health")
def health():
    return {
        "status": "ok",
        "arcface_model": model_manager.config.arcface_name,
        "antispoof_path": model_manager.config.antispoof_path,
    }

@app.post("/extract")
async def extract_single(file: UploadFile = File(...)):
    """Single frame — check-in/check-out SINGLE_FRAME mode."""
    return face_service.extract_face_data(await file.read())


@app.post("/extract-multi")
async def extract_multi(files: List[UploadFile] = File(...)):
    """Multi frame — register và MULTI_FRAME liveness."""
    images = [await f.read() for f in files]
    return face_service.extract_face_data_multi(images)