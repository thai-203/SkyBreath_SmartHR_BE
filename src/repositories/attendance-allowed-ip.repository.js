import { AppDataSource } from '../database/data-source.js';
import { AttendanceAllowedIpEntity } from '../models/entities/attendance-allowed-ip.entity.js';

export class AttendanceAllowedIpRepository {
  constructor() {
    this.repository = AppDataSource.getRepository(AttendanceAllowedIpEntity);
  }

  async findAllActive() {
    return this.repository.find({ where: { isDeleted: false }, order: { createdAt: 'DESC' } });
  }

  async findAllActiveByConfigId(configId) {
    return this.repository.find({
      where: {
        isDeleted: false,
        config: { id: configId },
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id) {
    return this.repository.findOne({ where: { id, isDeleted: false } });
  }

  async findByIpAndConfig(ipRange, configId) {
    return this.repository.findOne({
      where: {
        ipRange,
        isDeleted: false,
        config: { id: configId },
      },
    });
  }

  async create(data) {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async delete(id) {
    const item = await this.findById(id);
    if (!item) return null;
    item.isDeleted = true;
    return this.repository.save(item);
  }

  async deleteByConfigId(configId) {
    await this.repository
      .createQueryBuilder()
      .update()
      .set({ isDeleted: true })
      .where('attendance_security_config_id = :configId', { configId })
      .execute();
  }
}
