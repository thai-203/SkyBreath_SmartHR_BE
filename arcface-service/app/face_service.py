import numpy as np
import cv2
from insightface.app import FaceAnalysis
from app.config import MODEL_NAME, DETECTION_SIZE

class FaceService:

    def __init__(self):
        self.app = FaceAnalysis(name=MODEL_NAME)
        self.app.prepare(ctx_id=0, det_size=DETECTION_SIZE)

    def get_embedding(self, image_bytes):
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if img is None:
            print("❌ Image decode failed")
            return {
                "success": False,
                "message": "Invalid image"
            }
        
        print("✅ Image shape:", img.shape)
        
        faces = self.app.get(img)

        print("faces detected:", len(faces))

        if len(faces) == 0:
            return {
                "success": False,
                "message": "No face detected",
            }

        embedding = faces[0].embedding.tolist()

        return {
            "success": True,
            "embeddings": [embedding]
        }

    def compare_faces(self, emb1, emb2):
        emb1 = np.array(emb1)
        emb2 = np.array(emb2)

        similarity = np.dot(emb1, emb2) / (
            np.linalg.norm(emb1) * np.linalg.norm(emb2)
        )

        return float(similarity)

    # ✅ PHẢI nằm trong class
    def extract_and_validate(self, images):

        embeddings = []

        for image_bytes in images:

            emb = self.get_embedding(image_bytes)

            if not emb["success"]:
                return {
                    "success": False,
                    "message": "Face not detected"
                }

            embeddings.append(emb["embeddings"][0])

        base = np.array(embeddings[0])

        for emb in embeddings[1:]:

            sim = self.compare_faces(base, emb)

            if sim < 0.45:
                return {
                    "success": False,
                    "message": "Different persons detected",
                    "similarity": sim
                }

        return {
            "success": True,
            "faces": len(embeddings),
            "embeddings": embeddings
        }