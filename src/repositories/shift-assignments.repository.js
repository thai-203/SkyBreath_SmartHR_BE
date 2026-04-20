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
      .leftJoinAndSelect('assign.department', 'department')
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
      query.andWhere(
        '(employee.departmentId = :departmentId OR assign.departmentId = :departmentId)',
        { departmentId },
      );
    }

    const [items, total] = await query
      .orderBy('assign.effectiveFrom', 'DESC')
      .skip(skip)
      .take(take)
      .getManyAndCount();

    return { items, total };
  }

  async findAllActive(options = {}) {
    const { employeeId, departmentId, shiftId } = options;
    const query = this.repository
      .createQueryBuilder('assign')
      .leftJoinAndSelect('assign.employee', 'employee')
      .leftJoinAndSelect('assign.department', 'department')
      .leftJoinAndSelect('assign.shift', 'shift')
      .where('assign.isDeleted = :isDeleted', { isDeleted: false });

    if (employeeId) {
      query.andWhere('assign.employeeId = :employeeId', { employeeId });
    }
    if (shiftId) {
      query.andWhere('assign.shiftId = :shiftId', { shiftId });
    }
    if (departmentId) {
      query.andWhere(
        '(employee.departmentId = :departmentId OR assign.departmentId = :departmentId)',
        { departmentId },
      );
    }

    return query.orderBy('assign.effectiveFrom', 'DESC').getMany();
  }

  // returns all (unpaginated) assignments for a given employee and shift
  async findByEmployeeAndShift(employeeId, shiftId) {
    const query = this.repository
      .createQueryBuilder('assign')
      .leftJoinAndSelect('assign.employee', 'employee')
      .leftJoinAndSelect('assign.shift', 'shift')
      .where('assign.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('assign.employeeId = :employeeId', { employeeId })
      .andWhere('assign.shiftId = :shiftId', { shiftId });
    return query.orderBy('assign.effectiveFrom', 'DESC').getMany();
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

  async hasAssignmentsByShiftId(shiftId) {
    if (!shiftId) return false;

    const count = await this.repository.count({
      where: {
        shiftId,
        isDeleted: false,
      },
    });

    return count > 0;
  }
}
