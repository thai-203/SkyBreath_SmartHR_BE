import { AttendanceAllowedIpRepository } from '../repositories/attendance-allowed-ip.repository.js';
import { AttendanceSecurityConfigService } from './attendance-security-config.service.js';

export class AttendanceAllowedIpService {
  constructor(
    repo = new AttendanceAllowedIpRepository(),
    configService = new AttendanceSecurityConfigService(),
  ) {
    this.repo = repo;
    this.configService = configService;
  }

  async listAllowedIps() {
    const config = await this.configService.getConfig();
    return this.repo.findAllActiveByConfigId(config.id);
  }

  async createAllowedIp(data) {
    const config = await this.configService.getConfig();

    const existing = await this.repo.findByIpAndConfig(data.ipRange, config.id);
    if (existing) {
      throw new Error('IP đã tồn tại trong danh sách');
    }

    return this.repo.create({ ...data, config });
  }

  async deleteAllowedIp(id) {
    return this.repo.delete(id);
  }
}
