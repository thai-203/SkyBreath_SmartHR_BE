import { AppDataSource } from '../database/data-source.js';
import { JobGradeEntity } from '../models/entities/job-grade.entity.js';
import { Like } from 'typeorm';

export class JobGradesRepository {
  constructor() {
    this.repository = AppDataSource.getRepository(JobGradeEntity);
  }

  async create(data) {
    const jobGrade = this.repository.create(data);
    return this.repository.save(jobGrade);
  }

  async findAll(queryDto) {
    const { skip, limit, sortBy, sortOrder, search } = queryDto;

    const order = {};
    if (sortBy) {
      order[sortBy] = sortOrder;
    } else {
      order.minSalary = 'DESC';
    }

    const where = {
      isDeleted: false,
    };

    if (search) {
      where.gradeName = Like(`%${search}%`);
    }

    return this.repository.findAndCount({
      where,
      order,
      skip,
      take: limit,
    });
  }

  async findById(id) {
    return this.repository.findOne({
      where: { id, isDeleted: false },
    });
  }

  async findByName(name) {
    return this.repository.findOne({
      where: { gradeName: name, isDeleted: false },
    });
  }

  async update(id, data) {
    await this.repository.update(id, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('Job Grade not found');
    }
    return updated;
  }

  async delete(id) {
    await this.repository.update(id, {
      isDeleted: true,
      deletedAt: new Date(),
    });
  }

  async findList() {
    return this.repository.find({
      where: { isDeleted: false },
      select: ['id', 'gradeName', 'minSalary', 'maxSalary'],
      order: { gradeName: 'ASC' },
    });
  }
}
