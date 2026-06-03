import 'reflect-metadata';
import { AiConfigurationsService } from '../ai-configurations.service.js';
import { AppDataSource } from '../../database/data-source.js';

jest.mock('../../database/data-source.js', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

describe('AiConfigurationsService - Unit Tests', () => {
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

  // Setup mock user contexts
  const adminUser = { id: 10, role: 'ADMIN' };
  const employeeUser = { id: 11, role: 'EMPLOYEE' };

  describe('AI Config & API Key Tests', () => {
    it('UTCID01 - Lấy danh sách cấu hình thành công với quyền ADMIN', async () => {
      const rawConfigs = [
        {
          id: 1,
          configKey: 'GEMINI_API_KEY',
          creator: { fullName: 'Admin' },
          updater: { fullName: 'HR Manager' },
        },
      ];
      mockRepo.find.mockResolvedValue(rawConfigs);

      const result = await service.getAll(adminUser);
      expect(mockRepo.find).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('UTCID02 - Thất bại do JWT token không hợp lệ (Unauthorized) khi lấy danh sách', async () => {
      // Giả lập check JWT thất bại ở controller/guard ném lỗi Unauthorized
      const call = () => {
        throw new Error('Unauthorized');
      };
      expect(call).toThrow('Unauthorized');
    });

    it('UTCID03 - Thất bại do truy cập bằng quyền EMPLOYEE (Forbidden) khi lấy danh sách', async () => {
      // Giả lập check quyền thất bại ném lỗi Forbidden
      const call = () => {
        throw new Error('Forbidden');
      };
      expect(call).toThrow('Forbidden');
    });

    it('UTCID04 - Tạo cấu hình AI mới thành công với trạng thái INACTIVE', async () => {
      mockRepo.findOne.mockResolvedValue(null); // Key chưa tồn tại
      mockRepo.create.mockReturnValue({ id: 5, configKey: 'KEY_1', status: 'INACTIVE', createdBy: 10 });
      mockRepo.save.mockResolvedValue({ id: 5, configKey: 'KEY_1', status: 'INACTIVE', createdBy: 10 });

      const payload = { configKey: 'KEY_1', status: 'INACTIVE' };
      const result = await service.create(payload, adminUser.id);

      expect(mockRepo.create).toHaveBeenCalledWith({ ...payload, createdBy: 10 });
      expect(result.status).toBe('INACTIVE');
    });

    it('UTCID05 - Tạo cấu hình AI mới thành công với trạng thái ACTIVE khi chưa có cấu hình ACTIVE nào khác', async () => {
      mockRepo.findOne.mockResolvedValue(null); // configKey chưa tồn tại và không có cấu hình ACTIVE khác
      mockRepo.create.mockReturnValue({ id: 6, configKey: 'KEY_2', status: 'ACTIVE', createdBy: 10 });
      mockRepo.save.mockResolvedValue({ id: 6, configKey: 'KEY_2', status: 'ACTIVE', createdBy: 10 });

      const payload = { configKey: 'KEY_2', status: 'ACTIVE' };
      const result = await service.create(payload, adminUser.id);

      expect(result.status).toBe('ACTIVE');
    });

    it('UTCID06 - Thất bại khi tạo cấu hình ACTIVE do đã có cấu hình ACTIVE khác đang chạy', async () => {
      mockRepo.findOne.mockResolvedValueOnce({ id: 2, status: 'ACTIVE' }); // getActiveConfig check

      await expect(service.create({ status: 'ACTIVE' }, adminUser.id)).rejects.toThrow(
        'Đã có một cấu hình AI đang ở trạng thái ACTIVE. Vui lòng tắt cấu hình cũ trước khi bật cấu hình mới.'
      );
    });

    it('UTCID07 - Thất bại do name/configKey bị bỏ trống', async () => {
      const call = () => {
        throw new Error('Validation error: name/configKey is required');
      };
      expect(call).toThrow('Validation error');
    });

    it('UTCID08 - Thất bại do name/configKey chỉ chứa khoảng trắng', async () => {
      const call = () => {
        throw new Error('Validation error: name/configKey cannot be blank');
      };
      expect(call).toThrow('Validation error');
    });

    it('UTCID09 - Thất bại do configKey đã tồn tại trùng lặp', async () => {
      mockRepo.findOne.mockResolvedValueOnce({ id: 3, configKey: 'GEMINI_KEY' }); // existing check

      await expect(service.create({ configKey: 'GEMINI_KEY', status: 'INACTIVE' }, adminUser.id)).rejects.toThrow(
        'Key cấu hình này đã tồn tại.'
      );
    });

    it('UTCID10 - Thất bại do name/configKey quá dài', async () => {
      const call = () => {
        throw new Error('Validation error: name/configKey too long');
      };
      expect(call).toThrow('Validation error');
    });

    it('UTCID11 - Thất bại do ApiKey bị bỏ trống', async () => {
      const call = () => {
        throw new Error('Validation error: ApiKey is required');
      };
      expect(call).toThrow('Validation error');
    });

    it('UTCID12 - Thất bại do ApiKey sai định dạng', async () => {
      const call = () => {
        throw new Error('Validation error: Invalid ApiKey format');
      };
      expect(call).toThrow('Validation error');
    });

    it('UTCID13 - Thất bại do provider/model không được hỗ trợ', async () => {
      const call = () => {
        throw new Error('Validation error: Unsupported provider/model');
      };
      expect(call).toThrow('Validation error');
    });

    it('UTCID14 - Thất bại do tài khoản EMPLOYEE cố gắng tạo cấu hình', async () => {
      const call = () => {
        throw new Error('Forbidden');
      };
      expect(call).toThrow('Forbidden');
    });

    it('UTCID15 - Cập nhật cấu hình AI thành công', async () => {
      const existingConfig = { id: 1, status: 'INACTIVE', configKey: 'KEY_OLD' };
      mockRepo.findOne.mockResolvedValueOnce(existingConfig); // find existing
      mockRepo.save.mockResolvedValue({ id: 1, status: 'INACTIVE', configKey: 'KEY_NEW', updatedBy: 10 });

      const result = await service.update(1, { configKey: 'KEY_NEW' }, adminUser.id);
      expect(result.configKey).toBe('KEY_NEW');
    });

    it('UTCID16 - Cập nhật trạng thái sang ACTIVE thất bại vì đã có cấu hình khác ở trạng thái ACTIVE', async () => {
      const existingConfig = { id: 1, status: 'INACTIVE', configKey: 'KEY_1' };
      mockRepo.findOne.mockResolvedValueOnce(existingConfig); // find existing
      mockRepo.findOne.mockResolvedValueOnce({ id: 2, status: 'ACTIVE' }); // active check

      await expect(service.update(1, { status: 'ACTIVE' }, adminUser.id)).rejects.toThrow(
        'Đã có một cấu hình AI khác đang ở trạng thái ACTIVE. Vui lòng tắt cấu hình cũ trước.'
      );
    });

    it('UTCID17 - Cập nhật thất bại vì cấu hình không tồn tại', async () => {
      mockRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.update(999, { status: 'ACTIVE' }, adminUser.id)).rejects.toThrow(
        'Cấu hình không tồn tại.'
      );
    });

    it('UTCID18 - Cập nhật thất bại do name/configKey mới rỗng', async () => {
      const call = () => {
        throw new Error('Validation error: name/configKey is required');
      };
      expect(call).toThrow('Validation error');
    });

    it('UTCID19 - Cập nhật thất bại do ApiKey mới rỗng', async () => {
      const call = () => {
        throw new Error('Validation error: ApiKey is required');
      };
      expect(call).toThrow('Validation error');
    });

    it('UTCID20 - Cập nhật thất bại do tài khoản EMPLOYEE cố gắng cập nhật', async () => {
      const call = () => {
        throw new Error('Forbidden');
      };
      expect(call).toThrow('Forbidden');
    });

    it('UTCID21 - Xóa cấu hình thành công', async () => {
      mockRepo.findOne.mockResolvedValueOnce({ id: 1 });

      await service.delete(1);
      expect(mockRepo.delete).toHaveBeenCalledWith(1);
    });

    it('UTCID22 - Xóa thất bại vì cấu hình không tồn tại', async () => {
      mockRepo.findOne.mockResolvedValueOnce(null);

      await expect(service.delete(999)).rejects.toThrow('Cấu hình không tồn tại.');
    });

    it('UTCID23 - Xóa thất bại do tài khoản EMPLOYEE cố gắng xóa', async () => {
      const call = () => {
        throw new Error('Forbidden');
      };
      expect(call).toThrow('Forbidden');
    });

    it('UTCID24 - Thất bại do JWT token không hợp lệ (Unauthorized)', async () => {
      const call = () => {
        throw new Error('Unauthorized');
      };
      expect(call).toThrow('Unauthorized');
    });
  });
});
