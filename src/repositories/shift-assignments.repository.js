import { AppDataSource } from '../database/data-source.js';
import { ShiftAssignmentEntity } from '../models/entities/shift-assignment.entity.js';

export class ShiftAssignmentsRepository {
  constructor() {
    this.repository = AppDataSource.getRepository(ShiftAssignmentEntity);
  }

  async findAll(options = {}) {
    const { skip = 0, take = 10, employeeId, departmentId, shiftId } = options;
    const query = this.repository
      .createQueryBuilder('assign')
      .leftJoinAndSelect('assign.employee', 'employee')
      .leftJoinAndSelect('assign.shift', 'shift')
      .where('assign.isDeleted = :isDeleted', { isDeleted: false });

    if (employeeId) {
      query.andWhere('assign.employeeId = :employeeId', { employeeId });
    }
    if (shiftId) {
      query.andWhere('assign.shiftId = :shiftId', { shiftId });
    }
    // department filtering would require join on employee.department
    if (departmentId) {
      query.andWhere('employee.departmentId = :departmentId', { departmentId });
    }

    const [items, total] = await query
      .orderBy('assign.effectiveFrom', 'DESC')
      .skip(skip)
      .take(take)
      .getManyAndCount();

    return { items, total };
  }

  async findById(id) {
    return this.repository.findOne({
      where: { id, isDeleted: false },
      relations: ['employee', 'shift'],
    });
  }

  async create(data) {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async update(id, data) {
    await this.repository.update(id, data);
    return this.findById(id);
  }

  async softDelete(id) {
    return this.repository.update(id, {
      isDeleted: true,
      deletedAt: new Date(),
    });
  }
}
