import { AppDataSource } from '../database/data-source.js';
import { OnboardingProgressEntity } from '../models/entities/onboarding-progress.entity.js';

export class OnboardingProgressRepository {
  constructor() {
    this.repository = AppDataSource.getRepository(OnboardingProgressEntity);
  }

  async findAll(queryDto = {}) {
    const { skip = 0, take = 10, employeeId, overallStatus, planId } = queryDto;
    const where = { isDeleted: false };

    if (employeeId) {
      where.employeeId = employeeId;
    }
    if (overallStatus) {
      where.overallStatus = overallStatus;
    }
    if (planId) {
      where.planId = planId;
    }

    return this.repository.find({
      where,
      relations: [
        'employee',
        'employee.department',
        'employee.position',
        'plan',
        'assignedMentor',
        'taskAssignments',
        'taskAssignments.task',
      ],
      skip,
      take,
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id) {
    return this.repository.findOne({
      where: { id, isDeleted: false },
      relations: [
        'employee',
        'employee.department',
        'employee.position',
        'plan',
        'assignedMentor',
        'taskAssignments',
        'taskAssignments.task',
      ],
    });
  }

  async findByEmployeeId(employeeId) {
    return this.repository.findOne({
      where: { employeeId, isDeleted: false },
      relations: [
        'employee',
        'employee.department',
        'employee.position',
        'plan',
        'assignedMentor',
        'taskAssignments',
        'taskAssignments.task',
      ],
    });
  }

  async findByEmployeeAndPlan(employeeId, planId) {
    return this.repository.findOne({
      where: { employeeId, planId, isDeleted: false },
      relations: [
        'employee',
        'employee.department',
        'employee.position',
        'plan',
        'assignedMentor',
        'taskAssignments',
        'taskAssignments.task',
      ],
    });
  }

  async findInProgressByDepartment(departmentId) {
    return this.repository
      .createQueryBuilder('progress')
      .leftJoinAndSelect('progress.employee', 'employee')
      .leftJoinAndSelect('progress.plan', 'plan')
      .leftJoinAndSelect('progress.assignedMentor', 'mentor')
      .where('progress.overallStatus = :status', { status: 'IN_PROGRESS' })
      .andWhere('employee.departmentId = :departmentId', { departmentId })
      .andWhere('progress.isDeleted = :isDeleted', { isDeleted: false })
      .orderBy('progress.createdAt', 'DESC')
      .getMany();
  }

  async create(data) {
    const progress = this.repository.create(data);
    return this.repository.save(progress);
  }

  async update(id, data) {
    await this.repository.update(id, data);
    return this.findById(id);
  }

  async delete(id) {
    return this.repository.update(id, { isDeleted: true });
  }

  async count(queryDto = {}) {
    const { employeeId, overallStatus, planId } = queryDto;
    const where = { isDeleted: false };

    if (employeeId) {
      where.employeeId = employeeId;
    }
    if (overallStatus) {
      where.overallStatus = overallStatus;
    }
    if (planId) {
      where.planId = planId;
    }

    return this.repository.count({ where });
  }

  async countByStatus(status) {
    return this.repository.count({
      where: { overallStatus: status, isDeleted: false },
    });
  }
}
