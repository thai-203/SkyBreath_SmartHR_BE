import { AppDataSource } from '../database/data-source.js';
import { OnboardingPlanEntity } from '../models/entities/onboarding-plan.entity.js';
import { OnboardingTaskEntity } from '../models/entities/onboarding-task.entity.js';
import { BadRequestException } from '../common/exceptions/index.js';

export class OnboardingPlansRepository {
  constructor() {
    this.repository = AppDataSource.getRepository(OnboardingPlanEntity);
    this.taskRepository = AppDataSource.getRepository(OnboardingTaskEntity);
  }

  async findAll(skip = 0, take = 10) {
    return this.repository.find({
      relations: ['department', 'tasks'],
      where: { isDeleted: false, isTemplate: false },
      skip,
      take,
      order: { updatedAt: 'DESC' },
    });
  }

  async findById(id) {
    const planId = Number(id);

    if (Number.isNaN(planId)) {
      // invalid format -> signal bad request
      throw new BadRequestException('ID kế hoạch không hợp lệ');
    }

    return this.repository.findOne({
      where: {
        id: planId,
        isDeleted: false,
      },
      relations: ['department', 'tasks'],
    });
  }

  async findByDepartmentId(departmentId) {
    return this.repository.find({
      where: { departmentId, isDeleted: false, isTemplate: false },
      relations: ['tasks'],
    });
  }

  async findTemplates() {
    return this.repository.find({
      where: {
        isTemplate: true,
        isDeleted: false,
      },
      relations: ['tasks', 'department', 'position'],
      order: { updatedAt: 'DESC' },
    });
  }

  async create(data) {
    const plan = this.repository.create(data);
    return this.repository.save(plan);
  }

  async updatePlanOnly(id, data) {
    const { tasks, ...planData } = data;
    return this.repository.update(id, planData);
  }

  async delete(id) {
    return this.repository.update(id, {
      isDeleted: true,
      deletedAt: new Date(),
    });
  }

  async count() {
    return this.repository.count({ where: { isDeleted: false } });
  }

  async save(plan) {
    return this.repository.save(plan);
  }

  async findTemplateByDepartmentAndPosition(departmentId, positionId) {
    return this.repository.findOne({
      where: {
        departmentId,
        positionId,
        isTemplate: true,
        isDeleted: false,
      },
    });
  }
}
