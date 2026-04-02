import { AppDataSource } from '../database/data-source.js';
import { AttendanceSecurityStatusEntity } from '../models/entities/attendance-security-status.entity.js';
import { MoreThan } from 'typeorm';

export class AttendanceSecurityStatusRepository {
  constructor() {
    this.repository = AppDataSource.getRepository(
      AttendanceSecurityStatusEntity,
    );
  }

  // Lấy trạng thái bảo mật của nhân viên
  async findByEmployeeId(employeeId) {
    return this.repository.findOne({ where: { employeeId } });
  }

  // Khởi tạo hoặc cập nhật trạng thái (Upsert)
  async saveStatus(data) {
    return this.repository.save(data);
  }

  // Reset hoàn toàn trạng thái khi Check-in/out thành công
  async resetStatus(employeeId) {
    return this.repository.delete({ employeeId });
  }
}
