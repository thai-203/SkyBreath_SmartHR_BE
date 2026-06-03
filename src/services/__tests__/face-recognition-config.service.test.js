import { FaceRecognitionConfigService } from '../face-recognition-config.service.js';

describe('FaceRecognitionConfigService', () => {
  let service;
  let mockRepo;
  let mockArcFaceService;

  beforeEach(() => {
    mockRepo = {
      findOneConfig: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      resetToDefaults: jest.fn(),
    };
    mockArcFaceService = {};
    service = new FaceRecognitionConfigService(mockRepo, mockArcFaceService);
  });

  describe('updateConfig', () => {
    // ── Recognition Threshold Validation ──────────────────────────────────
    it('should throw "Ngưỡng nhận diện phải là số từ 0.3 đến 0.9" if recognitionThreshold is less than 0.3', async () => {
      try {
        await service.updateConfig({ recognitionThreshold: 0.2 });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Ngưỡng nhận diện phải là số từ 0.3 đến 0.9');
      }
    });

    it('should throw "Ngưỡng nhận diện phải là số từ 0.3 đến 0.9" if recognitionThreshold is greater than 0.9', async () => {
      try {
        await service.updateConfig({ recognitionThreshold: 0.95 });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Ngưỡng nhận diện phải là số từ 0.3 đến 0.9');
      }
    });

    it('should throw "Ngưỡng nhận diện phải là số từ 0.3 đến 0.9" if recognitionThreshold is not a number', async () => {
      try {
        await service.updateConfig({ recognitionThreshold: 'not-a-number' });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Ngưỡng nhận diện phải là số từ 0.3 đến 0.9');
      }
    });

    // ── Spoof Threshold Validation ────────────────────────────────────────
    it('should throw "Ngưỡng chống giả mạo phải là số từ 0 đến 0.95" if spoofThreshold is less than 0', async () => {
      try {
        await service.updateConfig({ spoofThreshold: -0.1 });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Ngưỡng chống giả mạo phải là số từ 0 đến 0.95');
      }
    });

    it('should throw "Ngưỡng chống giả mạo phải là số từ 0 đến 0.95" if spoofThreshold is greater than 0.95', async () => {
      try {
        await service.updateConfig({ spoofThreshold: 0.96 });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Ngưỡng chống giả mạo phải là số từ 0 đến 0.95');
      }
    });

    it('should throw "Ngưỡng chống giả mạo phải là số từ 0 đến 0.95" if spoofThreshold is not a number', async () => {
      try {
        await service.updateConfig({ spoofThreshold: 'invalid' });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Ngưỡng chống giả mạo phải là số từ 0 đến 0.95');
      }
    });

    // ── Success Cases ─────────────────────────────────────────────────────
    it('should update existing config with valid data', async () => {
      const existingConfig = {
        id: 'uuid-1',
        recognitionThreshold: 0.6,
        spoofThreshold: 0.8,
      };
      const updateData = { recognitionThreshold: 0.7, spoofThreshold: 0.85 };
      const expectedUpdateData = { recognitionThreshold: 0.7, spoofThreshold: 0.85 };

      mockRepo.findOneConfig.mockResolvedValue(existingConfig);
      mockRepo.update.mockResolvedValue({ ...existingConfig, ...expectedUpdateData });

      const result = await service.updateConfig(updateData);

      expect(mockRepo.findOneConfig).toHaveBeenCalled();
      expect(mockRepo.update).toHaveBeenCalledWith('uuid-1', expectedUpdateData);
      expect(result.recognitionThreshold).toBe(0.7);
      expect(result.spoofThreshold).toBe(0.85);
    });

    it('should create new config if none exists', async () => {
      const updateData = { recognitionThreshold: 0.7 };
      const expectedCreateData = { recognitionThreshold: 0.7 };

      mockRepo.findOneConfig.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue({ id: 'new-uuid', ...expectedCreateData });

      const result = await service.updateConfig(updateData);

      expect(mockRepo.findOneConfig).toHaveBeenCalled();
      expect(mockRepo.create).toHaveBeenCalledWith(expectedCreateData);
      expect(result.id).toBe('new-uuid');
      expect(result.recognitionThreshold).toBe(0.7);
    });

    it('should handle partial updates (only recognitionThreshold)', async () => {
      const existingConfig = { id: 'id1', recognitionThreshold: 0.6, spoofThreshold: 0.8 };
      mockRepo.findOneConfig.mockResolvedValue(existingConfig);
      mockRepo.update.mockResolvedValue({ ...existingConfig, recognitionThreshold: 0.8 });

      const result = await service.updateConfig({ recognitionThreshold: 0.8 });

      expect(mockRepo.update).toHaveBeenCalledWith('id1', { recognitionThreshold: 0.8 });
      expect(result.recognitionThreshold).toBe(0.8);
      expect(result.spoofThreshold).toBe(0.8);
    });

    it('should handle partial updates (only spoofThreshold)', async () => {
      const existingConfig = { id: 'id1', recognitionThreshold: 0.6, spoofThreshold: 0.8 };
      mockRepo.findOneConfig.mockResolvedValue(existingConfig);
      mockRepo.update.mockResolvedValue({ ...existingConfig, spoofThreshold: 0.9 });

      const result = await service.updateConfig({ spoofThreshold: 0.9 });

      expect(mockRepo.update).toHaveBeenCalledWith('id1', { spoofThreshold: 0.9 });
      expect(result.spoofThreshold).toBe(0.9);
      expect(result.recognitionThreshold).toBe(0.6);
    });
  });

  describe('getConfig', () => {
    it('should return existing config if found', async () => {
      const mockConfig = { id: '1', recognitionThreshold: 0.6 };
      mockRepo.findOneConfig.mockResolvedValue(mockConfig);

      const result = await service.getConfig();

      expect(mockRepo.findOneConfig).toHaveBeenCalled();
      expect(result).toEqual(mockConfig);
    });

    it('should create and return defaults if no config found', async () => {
      mockRepo.findOneConfig.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue({ id: 'new', recognitionThreshold: 0.6 });

      const result = await service.getConfig();

      expect(mockRepo.create).toHaveBeenCalled();
      expect(result.id).toBe('new');
    });
  });

  describe('resetToDefaults', () => {
    it('should call repo.resetToDefaults', async () => {
      mockRepo.resetToDefaults.mockResolvedValue({ id: '1', recognitionThreshold: 0.6 });

      const result = await service.resetToDefaults();

      expect(mockRepo.resetToDefaults).toHaveBeenCalled();
      expect(result.recognitionThreshold).toBe(0.6);
    });
  });
});
