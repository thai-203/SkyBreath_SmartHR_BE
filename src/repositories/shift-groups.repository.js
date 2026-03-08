import { AppDataSource } from '../database/data-source.js';
import { ShiftGroupEntity } from '../models/entities/shift-group.entity.js';

export class ShiftGroupsRepository {
  constructor() {
    this.repository = AppDataSource.getRepository(ShiftGroupEntity);
  }

  async findAll(options = {}) {
    const { skip = 0, take = 10, search, status } = options;

    // build base query and also load count of non-deleted shifts for each group
    const query = this.repository
      .createQueryBuilder('group')
      // map the relation count onto a virtual property `shiftCount`
      .loadRelationCountAndMap(
        'group.shiftCount',
        'group.shifts',
        'shift',
        (qb) =>
          qb.andWhere('shift.isDeleted = :notDeleted', { notDeleted: false }),
      )
      .where('group.isDeleted = :isDeleted', { isDeleted: false });

    if (search) {
      query.andWhere('group.groupName LIKE :search', { search: `%${search}%` });
    }

    if (status) {
      query.andWhere('group.status = :status', { status });
    }

    if (status) {
      query.andWhere('group.status = :status', { status });
    }

    const [items, total] = await query
      .orderBy('group.groupName', 'ASC')
      .skip(skip)
      .take(take)
      .getManyAndCount();

    return { items, total };
  }

  async findById(id) {
    return this.repository
      .createQueryBuilder('group')
      .leftJoinAndSelect(
        'group.shifts',
        'shift',
        'shift.isDeleted = :notDeleted',
        {
          notDeleted: false,
        },
      )
      .where('group.id = :id', { id })
      .andWhere('group.isDeleted = :isDeleted', { isDeleted: false })
      .getOne();
  }

  async create(data) {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async hasShifts(id) {
    const count = await this.repository
      .createQueryBuilder('group')
      .leftJoin('group.shifts', 'shift', 'shift.isDeleted = :notDeleted', {
        notDeleted: false,
      })
      .where('group.id = :id', { id })
      .andWhere('group.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('shift.id IS NOT NULL')
      .getCount();
    return count > 0;
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
