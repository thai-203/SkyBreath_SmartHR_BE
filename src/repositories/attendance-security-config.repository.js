import { AppDataSource } from '../database/data-source.js';
import { AttendanceSecurityConfigEntity } from '../models/entities/attendance-security-config.entity.js';

export class AttendanceSecurityConfigRepository {
  constructor() {
    this.repository = AppDataSource.getRepository(AttendanceSecurityConfigEntity);
  }

  async findOneConfig() {
    return this.repository.findOne({ where: { isDeleted: false } });
  }

  async create(data) {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async update(id, data) {
    await this.repository.update(id, data);
    return this.findById(id);
  }

  async findById(id) {
    return this.repository.findOne({ where: { id, isDeleted: false } });
  }

  async upsert(data) {
    const existing = await this.findOneConfig();
    if (existing) {
      await this.repository.update(existing.id, data);
      return this.findById(existing.id);
    }
    return this.create(data);
  }

  async resetToDefaults(defaults) {
    const existing = await this.findOneConfig();
    if (existing) {
      await this.repository.update(existing.id, defaults);
      return this.findById(existing.id);
    }
    return this.create(defaults);
  }
}
