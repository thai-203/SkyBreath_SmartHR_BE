import { AppDataSource } from '../database/data-source.js';
import { FaceDataEntity } from '../models/entities/face-data.entity.js';

export class FaceDataRepository {
  constructor() {
    this.repository = AppDataSource.getRepository(FaceDataEntity);
  }

  async findAll() {
    return this.repository.find({
      order: { registeredAt: 'DESC' },
      relations: ['employee'],
    });
  }

  async findById(id) {
    return this.repository.findOne({
      where: { id },
      relations: ['employee'],
    });
  }

  async findByEmployeeId(employeeId) {
    return this.repository.find({
      where: { employeeId },
      order: { registeredAt: 'DESC' },
    });
  }

  async create(data) {
    const face = this.repository.create(data);
    return this.repository.save(face);
  }

  async createMany(data) {
    const faces = this.repository.create(data);
    return this.repository.save(faces);
  }

  async deleteByEmployeeId(employeeId) {
    return this.repository.delete({
      employeeId: employeeId,
    });
  }

  async deleteById(id) {
    return this.repository.delete({ id });
  }
}
