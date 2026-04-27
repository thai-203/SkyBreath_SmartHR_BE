import { AttendanceAllowedIpService } from '../attendance-allowed-ip.service.js';
import { AppMessages } from '../../common/constants/app-messages.constant.js';

describe('AttendanceAllowedIpService', () => {
  let service;
  let mockRepo;
  let mockConfigService;

  beforeEach(() => {
    mockRepo = {
      findAllActiveByConfigId: jest.fn(),
      findByIpAndConfig: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    };
    mockConfigService = {
      getConfig: jest.fn(),
    };
    service = new AttendanceAllowedIpService(mockRepo, mockConfigService);
  });

  describe('createAllowedIp', () => {
    it('should throw error if ipRange is missing', async () => {
      try {
        await service.createAllowedIp({});
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('IP Range không hợp lệ hoặc bị trống');
      }
    });

    it('should throw error if ipRange is not a string', async () => {
      try {
        await service.createAllowedIp({ ipRange: 12345 });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('IP Range không hợp lệ hoặc bị trống');
      }
    });

    it('should throw error if ipRange is empty string', async () => {
      try {
        await service.createAllowedIp({ ipRange: '   ' });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('IP Range không hợp lệ hoặc bị trống');
      }
    });

    it('should throw error if IP already exists', async () => {
      const mockConfig = { id: 'config-1' };
      mockConfigService.getConfig.mockResolvedValue(mockConfig);
      mockRepo.findByIpAndConfig.mockResolvedValue({ id: 'existing-ip' });

      try {
        await service.createAllowedIp({ ipRange: '192.168.1.1' });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe(AppMessages.Errors.Attendance.ALLOWED_IP_ALREADY_EXISTS.message);
      }
    });

    it('should create allowed IP successfully', async () => {
      const mockConfig = { id: 'config-1' };
      mockConfigService.getConfig.mockResolvedValue(mockConfig);
      mockRepo.findByIpAndConfig.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue({ id: 'new-ip', ipRange: '192.168.1.1' });

      const result = await service.createAllowedIp({ ipRange: '192.168.1.1' });

      expect(mockConfigService.getConfig).toHaveBeenCalled();
      expect(mockRepo.findByIpAndConfig).toHaveBeenCalledWith('192.168.1.1', 'config-1');
      expect(mockRepo.create).toHaveBeenCalledWith({ ipRange: '192.168.1.1', config: mockConfig });
      expect(result.id).toBe('new-ip');
    });
  });
});
