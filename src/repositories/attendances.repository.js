import { AppDataSource } from '../database/data-source.js';
import { AttendanceRecordEntity } from '../models/entities/attendance-record.entity.js';

export class AttendanceRepository {
  constructor() {
    this.repository = AppDataSource.getRepository(AttendanceRecordEntity);
  }

  async findOne(options = {}) {
    const { employeeId, today } = options;
    return this.repository.findOne({
      where: { employeeId, workDate: today },
    });
  }
  async create(data) {
    const attendance = this.repository.create(data);
    return this.repository.save(attendance);
  }
  async update(id, data) {
    const res = await this.repository.update(id, data);
    return res;
  }
}
