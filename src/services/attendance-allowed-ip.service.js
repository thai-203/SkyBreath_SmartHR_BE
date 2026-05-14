import { AppMessages } from '../common/constants/app-messages.constant.js';
import { BadRequestException } from '../common/exceptions/index.js';
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
    const { ipRange } = data;

    if (!ipRange || typeof ipRange !== 'string' || ipRange.trim() === '') {
      throw new BadRequestException('IP Range không hợp lệ hoặc bị trống');
    }

    const config = await this.configService.getConfig();

    const existing = await this.repo.findByIpAndConfig(ipRange, config.id);
    if (existing) {
      throw new BadRequestException(
        AppMessages.Errors.Attendance.ALLOWED_IP_ALREADY_EXISTS.message,
      );
    }

    return this.repo.create({ ipRange, config });
  }

  async deleteAllowedIp(id) {
    return this.repo.delete(id);
  }
}
