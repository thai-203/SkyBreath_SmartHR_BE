import onnxruntime as ort
import numpy as np
import cv2


class AntiSpoofModel:
    def __init__(self, model_path: str):
        self.model_path = model_path
        self.session = ort.InferenceSession(model_path)
        inp_meta = self.session.get_inputs()[0]
        self.input_height, self.input_width = inp_meta.shape[2], inp_meta.shape[3]

    def preprocess(self, frame: np.ndarray) -> np.ndarray:
        img = cv2.resize(frame, (self.input_width, self.input_height))
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        img = img.astype(np.float32)
        img = (img - 127.5) / 128.0
        img = np.transpose(img, (2, 0, 1))
        img = np.expand_dims(img, 0)
        return img

    def predict(self, img: np.ndarray) -> float:
        inp = self.preprocess(img)
        output = self.session.run(None, {"input": inp})[0]
        
        print(f"[antispoof] input crop shape: {img.shape}")
        print(f"[antispoof] output raw: {output}")
        print(f"[antispoof] output[0,0]={output[0,0]:.4f} | output[0,1]={output[0,1]:.4f}")
        
        if output.size == 1:
            return float(output.item())
        else:
            return float(output[0, 1])