import asyncio
import logging
import os
import shutil
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass

from insightface.app import FaceAnalysis

from app.antispoof.model import AntiSpoofModel
from app.config import (
    ANTI_SPOOF_MODEL_PATH,
    DETECTION_SIZE,
    MODEL_NAME,
)

logger = logging.getLogger(__name__)

_executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="model-loader")


@dataclass
class ModelConfig:
    arcface_name: str = MODEL_NAME
    antispoof_path: str = ANTI_SPOOF_MODEL_PATH


def _fix_nested_model_dir(model_dir: str):
    if not os.path.exists(model_dir):
        return
    items = os.listdir(model_dir)
    if len(items) == 1:
        inner_path = os.path.join(model_dir, items[0])
        if os.path.isdir(inner_path):
            inner_items = os.listdir(inner_path)
            if any(f.endswith(".onnx") for f in inner_items):
                for f in inner_items:
                    shutil.move(os.path.join(inner_path, f), model_dir)
                os.rmdir(inner_path)
                logger.info("Fixed nested model folder: %s", model_dir)


def _load_models_sync(cfg: ModelConfig) -> tuple[FaceAnalysis, AntiSpoofModel]:
    insightface_root = os.path.expanduser("~/.insightface/models")
    model_path = os.path.join(insightface_root, cfg.arcface_name)

    try:
        temp = FaceAnalysis(name=cfg.arcface_name)
        temp.prepare(ctx_id=0, det_size=DETECTION_SIZE)
    except Exception:
        pass
    _fix_nested_model_dir(model_path)

    logger.info("Loading ArcFace: %s", cfg.arcface_name)
    arcface = FaceAnalysis(name=cfg.arcface_name)
    arcface.prepare(ctx_id=0, det_size=DETECTION_SIZE)

    if "detection" not in arcface.models:
        raise RuntimeError("ArcFace model thiếu detection sau khi load!")

    if not os.path.exists(cfg.antispoof_path):
        raise FileNotFoundError(f"AntiSpoof model không tồn tại: {cfg.antispoof_path}")

    logger.info("Loading AntiSpoof: %s", cfg.antispoof_path)
    antispoof = AntiSpoofModel(cfg.antispoof_path)

    return arcface, antispoof


class ModelManager:
    def __init__(self):
        self._arcface: FaceAnalysis | None = None
        self._antispoof: AntiSpoofModel | None = None
        self.config = ModelConfig()

    @property
    def arcface(self) -> FaceAnalysis:
        if self._arcface is None:
            raise RuntimeError("ArcFace chưa được khởi tạo.")
        return self._arcface

    @property
    def antispoof(self) -> AntiSpoofModel:
        if self._antispoof is None:
            raise RuntimeError("AntiSpoof chưa được khởi tạo.")
        return self._antispoof

    async def initialize(self):
        logger.info("Initializing models...")
        loop = asyncio.get_running_loop()
        arcface, antispoof = await loop.run_in_executor(
            _executor, _load_models_sync, self.config
        )
        self._arcface = arcface
        self._antispoof = antispoof
        logger.info("Models ready — arcface=%s | antispoof=%s",
                    self.config.arcface_name, self.config.antispoof_path)


model_manager = ModelManager()