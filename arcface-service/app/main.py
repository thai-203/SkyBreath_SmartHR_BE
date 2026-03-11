from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from typing import List

from app.face_service import FaceService

app = FastAPI()
face_service = FaceService()


class CompareRequest(BaseModel):
    embedding1: list
    embedding2: list


@app.get("/")
def root():
    return {"message": "ArcFace service running"}

# from fastapi import FastAPI, UploadFile, File
# from typing import List

@app.post("/register-validate")
async def register_validate(files: List[UploadFile] = File(...)):

    images = [await file.read() for file in files]

    result = face_service.extract_and_validate(images)

    return result

@app.post("/embedding")
async def get_embedding(file: UploadFile = File(...)):
    image_bytes = await file.read()

    embedding = face_service.get_embedding(image_bytes)

    if embedding is None:
        return {"success": False, "message": "No face detected"}

    return {
        "success": True,
        "embedding": embedding
    }


@app.post("/verify")
def verify_face(data: CompareRequest):
    similarity = face_service.compare_faces(
        data.embedding1,
        data.embedding2
    )

    return {
        "similarity": similarity
    }