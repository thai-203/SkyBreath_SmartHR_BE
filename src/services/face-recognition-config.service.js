import { FaceRecognitionConfigRepository } from '../repositories/face-recognition-config.repository.js';
import { ArcFaceService } from './arcface.service.js';
import { BadRequestException } from '../common/exceptions/index.js';

const DEFAULTS = {
  recognitionThreshold: 0.6,
  similarityMetric: 'cosine',
  maxEmbeddingsPerUser: 5,
  spoofThreshold: 0.8,
  livenessMode: 'SINGLE_FRAME',
  requiredFrames: 1,
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
    const { recognitionThreshold, spoofThreshold } = data;

    // Manual Validation
    if (recognitionThreshold !== undefined) {
      const val = Number(recognitionThreshold);
      if (isNaN(val) || val < 0.3 || val > 0.9) {
        throw new BadRequestException(
          'Ngưỡng nhận diện phải là số từ 0.3 đến 0.9',
        );
      }
    }

    if (spoofThreshold !== undefined) {
      const val = Number(spoofThreshold);
      if (isNaN(val) || val < 0 || val > 0.95) {
        throw new BadRequestException(
          'Ngưỡng chống giả mạo phải là số từ 0 đến 0.95',
        );
      }
    }

    const updateData = {};
    if (recognitionThreshold !== undefined)
      updateData.recognitionThreshold = Number(recognitionThreshold);
    if (spoofThreshold !== undefined)
      updateData.spoofThreshold = Number(spoofThreshold);

    const existing = await this.repo.findOneConfig();
    const updated = existing
      ? await this.repo.update(existing.id, updateData)
      : await this.repo.create(updateData);
    return updated;
  }

  async resetToDefaults() {
    const result = await this.repo.resetToDefaults(DEFAULTS);
    return result;
  }
}
