import numpy as np
import cv2

from app.model_manager import model_manager

class FaceService:

    def _crop_face(self, img, bbox, pad_ratio=0.1):
        x1, y1, x2, y2 = [int(v) for v in bbox]
        w, h = x2 - x1, y2 - y1

        x1_pad = int(x1 - w * pad_ratio)
        y1_pad = int(y1 - h * pad_ratio)
        x2_pad = int(x2 + w * pad_ratio)
        y2_pad = int(y2 + h * pad_ratio)

        img_h, img_w = img.shape[:2]
        x1_pad = max(0, x1_pad)
        y1_pad = max(0, y1_pad)
        x2_pad = min(img_w, x2_pad)
        y2_pad = min(img_h, y2_pad)

        crop = img[y1_pad:y2_pad, x1_pad:x2_pad]
                
        return crop

    def extract_face_data(self, image_bytes: bytes) -> dict:
        """
        Single frame — dùng cho check-in/check-out SINGLE_FRAME mode.
        """
        arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        if img is None:
            return {"success": False, "message": "Invalid image"}

        # 1. Chạy ArcFace để lấy tọa độ khuôn mặt trước
        faces_raw = model_manager.arcface.get(img)

        # Nếu không có mặt nào, trả về 0 luôn
        if not faces_raw:
            return {
                "success": True,
                "liveness_score": 0.0,
                "face_count": 0,
                "faces": []
            }

        # 2. Tìm khuôn mặt có diện tích lớn nhất (người đứng gần camera nhất)
        largest_face = max(faces_raw, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))

        # 3. Cắt ảnh khuôn mặt to nhất (với padding) và chấm điểm Liveness
        crop_img = self._crop_face(img, largest_face.bbox, pad_ratio=0.15)
        liveness_score = model_manager.antispoof.predict(crop_img) if crop_img.size > 0 else 0.0

        # 4. Gom dữ liệu trả về
        faces = []
        for face in faces_raw:
            bbox = face.bbox.tolist()
            x1, y1, x2, y2 = bbox
            faces.append({
                "bbox": bbox,
                "width": round(x2 - x1),
                "height": round(y2 - y1),
                "embedding": face.embedding.tolist(),
            })

        return {
            "success": True,
            "liveness_score": round(float(liveness_score), 4),
            "face_count": len(faces_raw),
            "faces": faces,
        }

    def extract_face_data_multi(self, images_bytes: list[bytes]) -> dict:
        """
        Multi frame — dùng cho register và MULTI_FRAME liveness.
        """
        frames = []
        liveness_scores = []

        for i, b in enumerate(images_bytes):
            arr = np.frombuffer(b, np.uint8)
            img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            
            if img is None:
                # Nếu ảnh lỗi, có thể bỏ qua frame này hoặc log lại
                continue

            faces_raw = model_manager.arcface.get(img)
            frame_liveness = 0.0
            faces = []

            if faces_raw:
                # Tìm khuôn mặt lớn nhất trong frame để chấm liveness
                largest_face = max(faces_raw, key=lambda f: (f.bbox[2] - f.bbox[0]) * (f.bbox[3] - f.bbox[1]))
                crop_img = self._crop_face(img, largest_face.bbox, pad_ratio=0.15)
                
                if crop_img.size > 0:
                    frame_liveness = model_manager.antispoof.predict(crop_img)

                for face in faces_raw:
                    bbox = face.bbox.tolist()
                    x1, y1, x2, y2 = bbox
                    faces.append({
                        "bbox": bbox,
                        "width": round(x2 - x1),
                        "height": round(y2 - y1),
                        "embedding": face.embedding.tolist(),
                    })

            liveness_scores.append(frame_liveness)
            frames.append({
                "frame_index": i,
                "liveness_score": round(float(frame_liveness), 4),
                "face_count": len(faces_raw),
                "faces": faces,
            })

        if not frames:
             return {"success": False, "message": "No valid frames to process"}

        # Tính trung bình điểm liveness của các frame hợp lệ
        avg_liveness = sum(liveness_scores) / len(liveness_scores) if liveness_scores else 0.0

        return {
            "success": True,
            "avg_liveness_score": round(float(avg_liveness), 4),
            "frame_count": len(frames),
            "frames": frames,
        }

face_service = FaceService()