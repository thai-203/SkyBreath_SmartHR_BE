import { FaceRecognitionConfigRepository } from '../repositories/face-recognition-config.repository.js';
import { ArcFaceService } from './arcface.service.js';

const DEFAULTS = {
  recognitionThreshold: 0.6,
  similarityMetric: 'cosine',
  maxEmbeddingsPerUser: 5,
  spoofThreshold: 0.8,
  livenessMode: 'MULTI_FRAME',
  requiredFrames: 10,
  captureIntervalMs: 1000,
  faceDetectionMinSize: 80,
  maxFacesAllowed: 1,
  arcfaceModelName: 'buffalo_l',
  antiSpoofModelVersion: 'modelrgb.onnx',
  saveAttendanceImage: true,
};

export class FaceRecognitionConfigService {
  /**
   * @param {FaceRecognitionConfigRepository} repo
   * @param {ArcFaceService} arcFaceService
   */
  constructor(
    repo = new FaceRecognitionConfigRepository(),
    arcFaceService = new ArcFaceService(),
  ) {
    this.repo = repo;
    this.arcFaceService = arcFaceService;
  }

  // ── CRUD ──────────────────────────────────────────────────────────────

  async getConfig() {
    let config = await this.repo.findOneConfig();
    if (!config) {
      config = await this.repo.create(DEFAULTS);
    }
    return config;
  }

  async updateConfig(data) {
    const existing = await this.repo.findOneConfig();
    const updated = existing
      ? await this.repo.update(existing.id, data)
      : await this.repo.create(data);
    return updated;
  }

  async resetToDefaults() {
    const result = await this.repo.resetToDefaults(DEFAULTS);
    return result;
  }
}
