import { AppDataSource } from '../database/data-source.js';
import { ShiftGroupEntity } from '../models/entities/shift-group.entity.js';

export class ShiftGroupsRepository {
  constructor() {
    this.repository = AppDataSource.getRepository(ShiftGroupEntity);
  }

  async findAll(options = {}) {
    const { skip = 0, take = 10, search } = options;
    const query = this.repository
      .createQueryBuilder('group')
      .where('group.isDeleted = :isDeleted', { isDeleted: false });

    if (search) {
      query.andWhere('group.groupName LIKE :search', { search: `%${search}%` });
    }

    const [items, total] = await query
      .orderBy('group.groupName', 'ASC')
      .skip(skip)
      .take(take)
      .getManyAndCount();

    return { items, total };
  }

  async findById(id) {
    return this.repository.findOne({
      where: { id, isDeleted: false },
      relations: ['shifts'],
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
