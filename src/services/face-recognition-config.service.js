import { FaceRecognitionConfigRepository } from '../repositories/face-recognition-config.repository.js';
import { AppMessages } from '../common/constants/index.js';

export class FaceRecognitionConfigService {
    constructor(repo = new FaceRecognitionConfigRepository()) {
        this.repo = repo;
    }

    async getConfig() {
        let config = await this.repo.findOneConfig();
        if (!config) {
            // Defaults mirror BE entity defaults
            const defaults = {
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
                antiSpoofModelVersion: null,
                saveAttendanceImage: true,
            };
            config = await this.repo.create(defaults);
        }
        return config;
    }

    async updateConfig(data) {
        const existing = await this.repo.findOneConfig();
        if (!existing) {
            return this.repo.create(data);
        }
        const updated = await this.repo.update(existing.id, data);
        return updated;
    }

    async resetToDefaults() {
        const defaults = {
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
            antiSpoofModelVersion: null,
            saveAttendanceImage: true,
        };
        const result = await this.repo.resetToDefaults(defaults);
        return result;
    }
}
