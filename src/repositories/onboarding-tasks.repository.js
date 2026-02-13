import { AppDataSource } from '../database/data-source.js';
import { OnboardingTaskEntity } from '../models/entities/onboarding-task.entity.js';

export class OnboardingTasksRepository {
  constructor() {
    this.repo = AppDataSource.getRepository(OnboardingTaskEntity);
  }

  findAll() {
    return this.repo.find({
      where: {
        isDeleted: false,
      },
      order: {
        createdAt: 'DESC',
      },
    });
  }


  findByPlanId(planId) {
    return this.repo.find({
      where: { planId },
      order: { taskOrder: 'ASC' },
    });
  }

  findById(id) {
    return this.repo.findOne({ where: { id } });
  }

  create(data) {
    return this.repo.create(data);
  }

  save(data) {
    return this.repo.save(data);
  }

  update(id, data) {
    return this.repo.update(id, data);
  }

  delete(ids) {
    return this.repo.delete(ids);
  }

  deleteByPlanId(planId) {
    return this.repo.update(
      { planId },
      { 
        isDeleted: true,
        deletedAt: new Date(),
      },
      
    );
  }
}
