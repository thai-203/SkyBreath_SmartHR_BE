import { AppDataSource } from '../database/data-source.js';
import { AttendanceBlockingConfigEntity } from '../models/entities/attendance-blocking-config.entity.js';

export class AttendanceBlockingConfigRepository {
  constructor() {
    this.repository = AppDataSource.getRepository(
      AttendanceBlockingConfigEntity,
    );
  }

  // Lấy tất cả (phục vụ render bảng ở FE)
  async findAll() {
    return this.repository.find({
      order: { createdAt: 'DESC' },
    });
  }

  // Tìm theo ID
  async findById(id) {
    return this.repository.findOne({ where: { id } });
  }

  // Tìm theo loại lỗi (dùng để validate trùng lặp)
  async findByErrorType(errorType) {
    return this.repository.findOne({
      where: { errorType },
    });
  }

  // Tìm config đang active theo loại lỗi (dùng trong middleware)
  async findActiveByErrorType(errorType) {
    return this.repository.findOne({
      where: { errorType, isActive: true },
    });
  }

  // Lưu hoặc cập nhật
  async save(data) {
    return this.repository.save(data);
  }

  // Xóa (nếu sau này bạn cần)
  async delete(id) {
    return this.repository.delete(id);
  }
}
