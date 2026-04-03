import { AppMessages } from '../common/constants/app-messages.constant.js';

export class AttendanceBlockingConfigService {
  constructor(attendanceBlockingConfigRepository) {
    this.attendanceBlockingConfigRepository =
      attendanceBlockingConfigRepository;
  }

  async getAll() {
    return await this.attendanceBlockingConfigRepository.findAll();
  }

  async create(data) {
    // Kiểm tra xem loại vi phạm này đã có quy tắc chưa
    const existing =
      await this.attendanceBlockingConfigRepository.findByErrorType(
        data.errorType,
      );
    if (existing) {
      throw new Error(AppMessages.Errors.Attendance.BLOCKING_RULE_ALREADY_EXISTS.message);
    }

    return await this.attendanceBlockingConfigRepository.save(data);
  }

  async update(id, data) {
    const config = await this.attendanceBlockingConfigRepository.findById(id);
    if (!config) {
      throw new Error(AppMessages.Errors.Attendance.BLOCKING_RULE_NOT_FOUND.message);
    }

    // Ghi đè dữ liệu mới vào config cũ
    Object.assign(config, data);
    return await this.attendanceBlockingConfigRepository.save(config);
  }

  async updateStatus(id, isActive) {
    const config = await this.attendanceBlockingConfigRepository.findById(id);
    if (!config) {
      throw new Error(AppMessages.Errors.Attendance.BLOCKING_RULE_NOT_FOUND.message);
    }

    config.isActive = isActive;
    return await this.attendanceBlockingConfigRepository.save(config);
  }

  async delete(id) {
    const config = await this.attendanceBlockingConfigRepository.findById(id);
    if (!config) {
      throw new Error(AppMessages.Errors.Attendance.BLOCKING_RULE_NOT_FOUND.message);
    }

    return await this.attendanceBlockingConfigRepository.delete(id);
  }
}
