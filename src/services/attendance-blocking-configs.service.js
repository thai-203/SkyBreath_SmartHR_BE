import { BadRequestException } from '../common/exceptions/index.js';
import { AppMessages } from '../common/constants/app-messages.constant.js';
import { ActionLogsRepository } from '../repositories/action-logs.repository.js';

export class AttendanceBlockingConfigService {
  constructor(attendanceBlockingConfigRepository) {
    this.attendanceBlockingConfigRepository =
      attendanceBlockingConfigRepository;
    this.actionLogRepo = new ActionLogsRepository();
  }

  async getAll() {
    const rules = await this.attendanceBlockingConfigRepository.findAll();
    return rules.map((r) => ({
      ...r,
      targetIds: r.targetIds ? r.targetIds.map(Number) : [],
    }));
  }

  _validateScope(applyTo, targetIds) {
    if (applyTo !== undefined && !['ALL', 'EMPLOYEE'].includes(applyTo)) {
      throw new BadRequestException('Phạm vi áp dụng không hợp lệ');
    }
    if (targetIds !== undefined) {
      if (!Array.isArray(targetIds)) {
        throw new BadRequestException('Danh sách ID áp dụng phải là một mảng');
      }
      return targetIds.map((id) => {
        const num = Number(id);
        if (isNaN(num)) {
          throw new BadRequestException('ID nhân viên phải là kiểu số');
        }
        return num;
      });
    }
    return targetIds;
  }

  async create(data) {
    const errorType = ['FACE', 'LOCATION', 'NETWORK'];
    if (!data.errorType || !errorType.includes(data.errorType)) {
      throw new BadRequestException('Loại vi phạm không hợp lệ');
    }

    if (!data.ruleName || String(data.ruleName).trim() === '') {
      throw new BadRequestException('Tên quy tắc không được để trống');
    }

    // Validate scope
    const normalizedTargetIds = this._validateScope(data.applyTo, data.targetIds);

    // Kiểm tra xem loại vi phạm này đã có quy tắc chưa
    const existing =
      await this.attendanceBlockingConfigRepository.findByErrorType(
        data.errorType,
      );
    if (existing) {
      throw new BadRequestException(AppMessages.Errors.Attendance.BLOCKING_RULE_ALREADY_EXISTS.message);
    }

    return await this.attendanceBlockingConfigRepository.save({
      ...data,
      targetIds: normalizedTargetIds ?? [],
    });
  }

  async update(id, data) {
    const errorType = ['FACE', 'LOCATION', 'NETWORK'];
    if (!data.errorType || !errorType.includes(data.errorType)) {
      throw new BadRequestException('Loại vi phạm không hợp lệ');
    }

    if (!data.ruleName || String(data.ruleName).trim() === '') {
      throw new BadRequestException('Tên quy tắc không được để trống');
    }

    // Validate scope
    const normalizedTargetIds = this._validateScope(data.applyTo, data.targetIds);

    const config = await this.attendanceBlockingConfigRepository.findById(id);
    if (!config) {
      throw new BadRequestException(AppMessages.Errors.Attendance.BLOCKING_RULE_NOT_FOUND.message);
    }

    // Ghi đè dữ liệu mới vào config cũ
    Object.assign(config, data);
    if (normalizedTargetIds !== undefined) {
      config.targetIds = normalizedTargetIds;
    }
    return await this.attendanceBlockingConfigRepository.save(config);
  }

  async updateStatus(id, isActive) {
    const config = await this.attendanceBlockingConfigRepository.findById(id);
    if (!config) {
      throw new BadRequestException(AppMessages.Errors.Attendance.BLOCKING_RULE_NOT_FOUND.message);
    }

    config.isActive = isActive;
    return await this.attendanceBlockingConfigRepository.save(config);
  }

  async delete(id) {
    const config = await this.attendanceBlockingConfigRepository.findById(id);
    if (!config) {
      throw new BadRequestException(AppMessages.Errors.Attendance.BLOCKING_RULE_NOT_FOUND.message);
    }

    return await this.attendanceBlockingConfigRepository.delete(id);
  }

  async getAttendanceLogs(params) {
    return this.actionLogRepo.findAttendanceLogs(params);
  }
}
