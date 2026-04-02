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
    const existing = await this.repo.findOneConfig();
    if (!existing) {
      return this.repo.create(data);
    }
    return this.repo.update(existing.id, data);
  }

  async resetToDefaults() {
    const defaults = {
      requireIpCheck: true,
      requireLocationCheck: false,
      officeLatitude: null,
      officeLongitude: null,
      locationRadiusMeters: null,
      blockVpn: false,
    };

    const result = await this.repo.resetToDefaults(defaults);

    // Reset allowed IPs as well when resetting all security settings.
    if (result?.id) {
      await this.allowedIpRepo.deleteByConfigId(result.id);
    }

    return result;
  }
}
