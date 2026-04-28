import { AttendanceSecurityConfigService } from '../attendance-security-config.service.js';

describe('AttendanceSecurityConfigService', () => {
  let service;
  let mockRepo;
  let mockAllowedIpRepo;

  beforeEach(() => {
    mockRepo = {
      findOneConfig: jest.fn(),
      create: jest.fn(),
      upsert: jest.fn(),
      resetToDefaults: jest.fn(),
    };
    mockAllowedIpRepo = {
      deleteByConfigId: jest.fn(),
    };
    service = new AttendanceSecurityConfigService(mockRepo, mockAllowedIpRepo);
  });

  describe('getConfig', () => {
    it('should return existing config if found', async () => {
      const mockConfig = { id: 1, applyTo: 'ALL' };
      mockRepo.findOneConfig.mockResolvedValue(mockConfig);

      const result = await service.getConfig();

      expect(mockRepo.findOneConfig).toHaveBeenCalled();
      expect(result).toEqual(mockConfig);
    });

    it('should create and return defaults if no config found', async () => {
      mockRepo.findOneConfig.mockResolvedValue(null);
      mockRepo.create.mockImplementation((data) => Promise.resolve({ id: 1, ...data }));

      const result = await service.getConfig();

      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        applyTo: 'ALL',
        requireIpCheck: true,
      }));
      expect(result.id).toBe(1);
    });
  });

  describe('updateConfig', () => {
    // ── Boolean Validations ───────────────────────────────────────────────
    it('should throw error if requireIpCheck is not boolean', async () => {
      try {
        await service.updateConfig({ requireIpCheck: 'yes' });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Kiểm tra IP phải là kiểu boolean');
      }
    });

    it('should throw error if requireLocationCheck is not boolean', async () => {
      try {
        await service.updateConfig({ requireLocationCheck: 1 });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Kiểm tra vị trí phải là kiểu boolean');
      }
    });

    it('should throw error if blockVpn is not boolean', async () => {
      try {
        await service.updateConfig({ blockVpn: 'true' });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Chặn VPN phải là kiểu boolean');
      }
    });

    // ── Location Validations (when requireLocationCheck is true) ───────────
    it('should throw error if officeLatitude is missing when location check is enabled', async () => {
      try {
        await service.updateConfig({ requireLocationCheck: true });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Vĩ độ văn phòng không được để trống');
      }
    });

    it('should throw error if officeLatitude is invalid', async () => {
      try {
        await service.updateConfig({ requireLocationCheck: true, officeLatitude: 100 });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Vĩ độ phải nằm trong khoảng -90 đến 90');
      }
    });

    it('should throw error if officeLongitude is missing when location check is enabled', async () => {
      try {
        await service.updateConfig({ requireLocationCheck: true, officeLatitude: 10 });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Kinh độ văn phòng không được để trống');
      }
    });

    it('should throw error if officeLongitude is invalid', async () => {
      try {
        await service.updateConfig({ requireLocationCheck: true, officeLatitude: 10, officeLongitude: 200 });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Kinh độ phải nằm trong khoảng -180 đến 180');
      }
    });

    it('should throw error if locationRadiusMeters is missing when location check is enabled', async () => {
      try {
        await service.updateConfig({ requireLocationCheck: true, officeLatitude: 10, officeLongitude: 20 });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Bán kính cho phép không được để trống');
      }
    });

    it('should throw error if locationRadiusMeters is negative', async () => {
      try {
        await service.updateConfig({ requireLocationCheck: true, officeLatitude: 10, officeLongitude: 20, locationRadiusMeters: -5 });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Bán kính phải lớn hơn hoặc bằng 0');
      }
    });

    // ── Scope & Target Validations ────────────────────────────────────────
    it('should throw error if applyTo is invalid', async () => {
      try {
        await service.updateConfig({ applyTo: 'DEPARTMENT' });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Phạm vi áp dụng không hợp lệ');
      }
    });

    it('should throw error if targetIds is not an array', async () => {
      try {
        await service.updateConfig({ targetIds: '1,2,3' });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('Danh sách ID áp dụng phải là một mảng');
      }
    });

    it('should throw error if targetIds contains non-numbers', async () => {
      try {
        await service.updateConfig({ targetIds: [1, 'abc'] });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toBe('ID nhân viên phải là kiểu số');
      }
    });

    // ── Success Case ──────────────────────────────────────────────────────
    it('should call upsert with normalized data on success', async () => {
      const validData = {
        applyTo: 'EMPLOYEE',
        targetIds: ['101', 102],
        requireLocationCheck: true,
        officeLatitude: '10.5',
        officeLongitude: 20.5,
        locationRadiusMeters: 100,
      };

      mockRepo.upsert.mockResolvedValue({ id: 1, ...validData, targetIds: [101, 102] });

      const result = await service.updateConfig(validData);

      expect(mockRepo.upsert).toHaveBeenCalledWith(expect.objectContaining({
        targetIds: [101, 102],
        officeLatitude: '10.5', // Service doesn't mutate string to number for latitude/longitude, just validates
      }));
      expect(result.id).toBe(1);
    });
  });

  describe('resetToDefaults', () => {
    it('should reset config and clear allowed IPs', async () => {
      const mockResult = { id: 1, applyTo: 'ALL' };
      mockRepo.resetToDefaults.mockResolvedValue(mockResult);

      const result = await service.resetToDefaults();

      expect(mockRepo.resetToDefaults).toHaveBeenCalled();
      expect(mockAllowedIpRepo.deleteByConfigId).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockResult);
    });
  });
});
