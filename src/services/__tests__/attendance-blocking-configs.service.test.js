import { jest } from '@jest/globals';
import { AttendanceBlockingConfigService } from '../attendance-blocking-configs.service.js';
import { BadRequestException } from '../../common/exceptions/index.js';
import { AppMessages } from '../../common/constants/app-messages.constant.js';

describe('AttendanceBlockingConfigService', () => {
  let service;
  let mockRepo;

  beforeEach(() => {
    mockRepo = {
      findAll: jest.fn(),
      findByErrorType: jest.fn(),
      findById: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    service = new AttendanceBlockingConfigService(mockRepo);
  });

  describe('create', () => {
    it('should throw BadRequestException if errorType is invalid', async () => {
      const data = { errorType: 'INVALID', ruleName: 'Test Rule' };
      await expect(service.create(data)).rejects.toThrow(BadRequestException);
      await expect(service.create(data)).rejects.toThrow('Loại vi phạm không hợp lệ');
    });

    it('should throw BadRequestException if ruleName is empty', async () => {
      const data = { errorType: 'FACE', ruleName: '   ' };
      await expect(service.create(data)).rejects.toThrow(BadRequestException);
      await expect(service.create(data)).rejects.toThrow('Tên quy tắc không được để trống');
    });

    it('should throw BadRequestException if applyTo is invalid', async () => {
      const data = { errorType: 'FACE', ruleName: 'Test Rule', applyTo: 'INVALID_SCOPE' };
      await expect(service.create(data)).rejects.toThrow(BadRequestException);
      await expect(service.create(data)).rejects.toThrow('Phạm vi áp dụng không hợp lệ');
    });

    it('should throw BadRequestException if targetIds is not an array', async () => {
      const data = { errorType: 'FACE', ruleName: 'Test Rule', applyTo: 'EMPLOYEE', targetIds: 'not-array' };
      await expect(service.create(data)).rejects.toThrow(BadRequestException);
      await expect(service.create(data)).rejects.toThrow('Danh sách ID áp dụng phải là một mảng');
    });

    it('should throw BadRequestException if targetIds contains non-number', async () => {
      const data = { errorType: 'FACE', ruleName: 'Test Rule', applyTo: 'EMPLOYEE', targetIds: [1, 'abc'] };
      await expect(service.create(data)).rejects.toThrow(BadRequestException);
      await expect(service.create(data)).rejects.toThrow('ID nhân viên phải là kiểu số');
    });

    it('should throw BadRequestException if rule already exists for errorType', async () => {
      const data = { errorType: 'FACE', ruleName: 'Test Rule' };
      mockRepo.findByErrorType.mockResolvedValue({ id: 1, errorType: 'FACE' });

      await expect(service.create(data)).rejects.toThrow(BadRequestException);
      await expect(service.create(data)).rejects.toThrow(AppMessages.Errors.Attendance.BLOCKING_RULE_ALREADY_EXISTS.message);
    });

    it('should successfully create a new rule with empty targetIds when missing', async () => {
      const data = { errorType: 'FACE', ruleName: 'Test Rule', applyTo: 'ALL' };
      mockRepo.findByErrorType.mockResolvedValue(null);
      mockRepo.save.mockResolvedValue({ id: 1, ...data, targetIds: [] });

      const result = await service.create(data);

      expect(mockRepo.findByErrorType).toHaveBeenCalledWith('FACE');
      expect(mockRepo.save).toHaveBeenCalledWith({
        ...data,
        targetIds: [],
      });
      expect(result).toEqual({ id: 1, ...data, targetIds: [] });
    });

    it('should successfully create a new rule and normalize targetIds', async () => {
      const data = { errorType: 'LOCATION', ruleName: 'Location Rule', applyTo: 'EMPLOYEE', targetIds: ['1', 2] };
      mockRepo.findByErrorType.mockResolvedValue(null);
      mockRepo.save.mockResolvedValue({ id: 2, ...data, targetIds: [1, 2] });

      const result = await service.create(data);

      expect(mockRepo.findByErrorType).toHaveBeenCalledWith('LOCATION');
      expect(mockRepo.save).toHaveBeenCalledWith({
        ...data,
        targetIds: [1, 2],
      });
      expect(result.targetIds).toEqual([1, 2]);
    });
  });

  describe('update', () => {
    it('should throw BadRequestException if errorType is invalid', async () => {
      const data = { errorType: 'INVALID', ruleName: 'Test Rule' };
      await expect(service.update(1, data)).rejects.toThrow(BadRequestException);
      await expect(service.update(1, data)).rejects.toThrow('Loại vi phạm không hợp lệ');
    });

    it('should throw BadRequestException if ruleName is empty', async () => {
      const data = { errorType: 'FACE', ruleName: '   ' };
      await expect(service.update(1, data)).rejects.toThrow(BadRequestException);
      await expect(service.update(1, data)).rejects.toThrow('Tên quy tắc không được để trống');
    });

    it('should throw BadRequestException if rule not found', async () => {
      const data = { errorType: 'FACE', ruleName: 'Updated Rule' };
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.update(999, data)).rejects.toThrow(BadRequestException);
      await expect(service.update(999, data)).rejects.toThrow(AppMessages.Errors.Attendance.BLOCKING_RULE_NOT_FOUND.message);
    });

    it('should successfully update a rule with modified fields', async () => {
      const existingConfig = { id: 1, errorType: 'FACE', ruleName: 'Old Rule', applyTo: 'ALL', targetIds: [] };
      const updateData = { errorType: 'FACE', ruleName: 'Updated Rule' };
      
      mockRepo.findById.mockResolvedValue(existingConfig);
      mockRepo.save.mockImplementation((config) => Promise.resolve(config));

      const result = await service.update(1, updateData);

      expect(mockRepo.findById).toHaveBeenCalledWith(1);
      expect(mockRepo.save).toHaveBeenCalledWith({
        id: 1,
        errorType: 'FACE',
        ruleName: 'Updated Rule',
        applyTo: 'ALL',
        targetIds: [],
      });
      expect(result.ruleName).toBe('Updated Rule');
    });

    it('should successfully update a rule and normalize targetIds', async () => {
      const existingConfig = { id: 2, errorType: 'NETWORK', ruleName: 'Network Rule', applyTo: 'ALL', targetIds: [] };
      const updateData = { errorType: 'NETWORK', ruleName: 'Network Rule', applyTo: 'EMPLOYEE', targetIds: ['3', '4'] };
      
      mockRepo.findById.mockResolvedValue(existingConfig);
      mockRepo.save.mockImplementation((config) => Promise.resolve(config));

      const result = await service.update(2, updateData);

      expect(mockRepo.findById).toHaveBeenCalledWith(2);
      expect(mockRepo.save).toHaveBeenCalledWith({
        id: 2,
        errorType: 'NETWORK',
        ruleName: 'Network Rule',
        applyTo: 'EMPLOYEE',
        targetIds: [3, 4],
      });
      expect(result.targetIds).toEqual([3, 4]);
    });
  });
});
