import { BadRequestException } from '../common/exceptions/index.js';
import { AttendanceSecurityConfigRepository } from '../repositories/attendance-security-config.repository.js';
import { AttendanceAllowedIpRepository } from '../repositories/attendance-allowed-ip.repository.js';

export class AttendanceSecurityConfigService {
  constructor(
    repo = new AttendanceSecurityConfigRepository(),
    allowedIpRepo = new AttendanceAllowedIpRepository(),
  ) {
    this.repo = repo;
    this.allowedIpRepo = allowedIpRepo;
  }

  async getConfig() {
    let config = await this.repo.findOneConfig();

    if (!config) {
      const defaults = {
        applyTo: 'ALL',
        targetIds: [],
        requireIpCheck: true,
        requireLocationCheck: false,
        officeLatitude: null,
        officeLongitude: null,
        locationRadiusMeters: null,
        blockVpn: false,
      };

      config = await this.repo.create(defaults);
    }
    return config;
  }

  async updateConfig(data) {
    const {
      requireIpCheck,
      requireLocationCheck,
      officeLatitude,
      officeLongitude,
      locationRadiusMeters,
      blockVpn,
      applyTo,
      targetIds,
    } = data;

    // Validate Booleans
    if (requireIpCheck !== undefined && typeof requireIpCheck !== 'boolean') {
      throw new BadRequestException('Kiểm tra IP phải là kiểu boolean');
    }
    if (requireLocationCheck !== undefined && typeof requireLocationCheck !== 'boolean') {
      throw new BadRequestException('Kiểm tra vị trí phải là kiểu boolean');
    }
    if (blockVpn !== undefined && typeof blockVpn !== 'boolean') {
      throw new BadRequestException('Chặn VPN phải là kiểu boolean');
    }

    // Validate Location
    if (requireLocationCheck) {
      if (officeLatitude === undefined || officeLatitude === null) {
        throw new BadRequestException('Vĩ độ văn phòng không được để trống');
      }
      const lat = Number(officeLatitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        throw new BadRequestException('Vĩ độ phải nằm trong khoảng -90 đến 90');
      }

      if (officeLongitude === undefined || officeLongitude === null) {
        throw new BadRequestException('Kinh độ văn phòng không được để trống');
      }
      const lng = Number(officeLongitude);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        throw new BadRequestException('Kinh độ phải nằm trong khoảng -180 đến 180');
      }

      if (locationRadiusMeters === undefined || locationRadiusMeters === null) {
        throw new BadRequestException('Bán kính cho phép không được để trống');
      }
      const radius = Number(locationRadiusMeters);
      if (isNaN(radius) || radius < 0) {
        throw new BadRequestException('Bán kính phải lớn hơn hoặc bằng 0');
      }
    }

    // Validate Scope
    if (applyTo !== undefined && !['ALL', 'EMPLOYEE'].includes(applyTo)) {
      throw new BadRequestException('Phạm vi áp dụng không hợp lệ');
    }

    if (targetIds !== undefined) {
      if (!Array.isArray(targetIds)) {
        throw new BadRequestException('Danh sách ID áp dụng phải là một mảng');
      }
      data.targetIds = targetIds.map((id) => {
        const num = Number(id);
        if (isNaN(num)) {
          throw new BadRequestException('ID nhân viên phải là kiểu số');
        }
        return num;
      });
    }

    return this.repo.upsert(data);
  }

  async resetToDefaults() {
    const defaults = {
      applyTo: 'ALL',
      targetIds: [],
      requireIpCheck: true,
      requireLocationCheck: false,
      officeLatitude: null,
      officeLongitude: null,
      locationRadiusMeters: null,
      blockVpn: false,
    };

    const result = await this.repo.resetToDefaults(defaults);

    if (result?.id) {
      await this.allowedIpRepo.deleteByConfigId(result.id);
    }

    return result;
  }
}
