import 'reflect-metadata';
import { AiConfigurationsService } from '../ai-configurations.service.js';
import { AppDataSource } from '../../database/data-source.js';

jest.mock('../../database/data-source.js', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

describe('AiConfigurationsService', () => {
  let service;
  let mockRepo;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    AppDataSource.getRepository.mockReturnValue(mockRepo);
    service = new AiConfigurationsService();
  });

  describe('getActiveConfig', () => {
    it('returns active configuration', async () => {
      const activeConfig = { id: 1, status: 'ACTIVE' };
      mockRepo.findOne.mockResolvedValue(activeConfig);

      const result = await service.getActiveConfig();

      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { status: 'ACTIVE' } });
      expect(result).toEqual(activeConfig);
    });
  });

  describe('getAll', () => {
    it('returns all configurations with creator and updater names', async () => {
      const rawConfigs = [
        {
          id: 1,
          configKey: 'GEMINI_API_KEY',
          creator: { fullName: 'Admin' },
          updater: { fullName: 'HR Manager' },
        },
      ];
      mockRepo.find.mockResolvedValue(rawConfigs);

      const result = await service.getAll();

      expect(mockRepo.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC' },
        relations: ['creator', 'updater'],
      });
      expect(result).toEqual([
        {
          id: 1,
          configKey: 'GEMINI_API_KEY',
          creator: { fullName: 'Admin' },
          updater: { fullName: 'HR Manager' },
          creatorName: 'Admin',
          updaterName: 'HR Manager',
        },
      ]);
    });
  });

  describe('create', () => {
    it('throws error when trying to create an ACTIVE config when another ACTIVE one exists', async () => {
      mockRepo.findOne.mockResolvedValueOnce({ id: 2, status: 'ACTIVE' }); // for getActiveConfig

      await expect(service.create({ status: 'ACTIVE' }, 10)).rejects.toThrow(
        'Đã có một cấu hình AI đang ở trạng thái ACTIVE. Vui lòng tắt cấu hình cũ trước khi bật cấu hình mới.'
      );
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('throws error when configKey already exists', async () => {
      mockRepo.findOne.mockResolvedValueOnce({ id: 3, configKey: 'KEY' }); // existing check

      await expect(service.create({ configKey: 'KEY', status: 'INACTIVE' }, 10)).rejects.toThrow(
        'Key cấu hình này đã tồn tại.'
      );
      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('saves new configuration successfully when valid', async () => {
      mockRepo.findOne.mockResolvedValue(null); // neither active exists nor duplicate key
      mockRepo.create.mockReturnValue({ id: 5, configKey: 'KEY', createdBy: 10 });
      mockRepo.save.mockResolvedValue({ id: 5, configKey: 'KEY', createdBy: 10 });

      const payload = { configKey: 'KEY', status: 'INACTIVE' };
      const result = await service.create(payload, 10);

      expect(mockRepo.create).toHaveBeenCalledWith({ ...payload, createdBy: 10 });
      expect(mockRepo.save).toHaveBeenCalled();
      expect(result).toEqual({ id: 5, configKey: 'KEY', createdBy: 10 });
    });
  });

  describe('update', () => {
    it('throws error when configuration does not exist', async () => {
      mockRepo.findOne.mockResolvedValueOnce(null); // not found config

      await expect(service.update(999, { status: 'ACTIVE' }, 10)).rejects.toThrow(
        'Cấu hình không tồn tại.'
      );
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('throws error when updating status to ACTIVE and another configuration is already ACTIVE', async () => {
      const existingConfig = { id: 1, status: 'INACTIVE', configKey: 'KEY1' };
      mockRepo.findOne.mockResolvedValueOnce(existingConfig); // find existing
      mockRepo.findOne.mockResolvedValueOnce({ id: 2, status: 'ACTIVE' }); // active check in getActiveConfig

      await expect(service.update(1, { status: 'ACTIVE' }, 10)).rejects.toThrow(
        'Đã có một cấu hình AI khác đang ở trạng thái ACTIVE. Vui lòng tắt cấu hình cũ trước.'
      );
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('throws error when updating configKey to one that already exists', async () => {
      const existingConfig = { id: 1, status: 'INACTIVE', configKey: 'KEY1' };
      mockRepo.findOne.mockResolvedValueOnce(existingConfig); // find existing
      mockRepo.findOne.mockResolvedValueOnce({ id: 2, configKey: 'KEY2' }); // check duplicate key

      await expect(service.update(1, { configKey: 'KEY2' }, 10)).rejects.toThrow(
        'Key cấu hình này đã tồn tại.'
      );
      expect(mockRepo.save).not.toHaveBeenCalled();
    });

    it('saves updated configuration successfully', async () => {
      const existingConfig = { id: 1, status: 'INACTIVE', configKey: 'KEY1' };
      mockRepo.findOne.mockResolvedValueOnce(existingConfig); // find existing
      mockRepo.save.mockResolvedValue({ id: 1, status: 'ACTIVE', configKey: 'KEY1', updatedBy: 10 });

      const result = await service.update(1, { status: 'ACTIVE' }, 10);

      expect(mockRepo.save).toHaveBeenCalledWith(expect.objectContaining({
        id: 1,
        status: 'ACTIVE',
        updatedBy: 10,
      }));
      expect(result.status).toBe('ACTIVE');
    });
  });

  describe('delete', () => {
    it('throws error if configuration does not exist', async () => {
      mockRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.delete(999)).rejects.toThrow('Cấu hình không tồn tại.');
      expect(mockRepo.delete).not.toHaveBeenCalled();
    });

    it('hard deletes the configuration successfully', async () => {
      mockRepo.findOne.mockResolvedValueOnce({ id: 1 });

      await service.delete(1);

      expect(mockRepo.delete).toHaveBeenCalledWith(1);
    });
  });
});
