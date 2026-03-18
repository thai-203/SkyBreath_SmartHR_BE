import { AppDataSource } from '../database/data-source.js';
import { WorkingShiftEntity } from '../models/entities/working-shift.entity.js';

export class WorkingShiftsRepository {
  constructor() {
    this.repository = AppDataSource.getRepository(WorkingShiftEntity);
  }

  async findAll(options = {}) {
    const { skip = 0, take = 10, groupId, search } = options;
    const query = this.repository
      .createQueryBuilder('shift')
      .leftJoinAndSelect('shift.group', 'group')
      .where('shift.isDeleted = :isDeleted', { isDeleted: false });

    if (groupId) {
      query.andWhere('shift.groupId = :groupId', { groupId });
    }

    if (search) {
      query.andWhere('shift.shiftName LIKE :search', { search: `%${search}%` });
    }

    const [items, total] = await query
      .orderBy('shift.shiftName', 'ASC')
      .skip(skip)
      .take(take)
      .getManyAndCount();

    return { items, total };
  }

  async findById(id) {
    return this.repository.findOne({
      where: { id, isDeleted: false },
      relations: ['group'],
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

  async findList() {
    return this.repository.find({
        where: { isDeleted: false },
        select: ['id', 'shiftName'],
        order: { shiftName: 'ASC' },
    });
  }
}
