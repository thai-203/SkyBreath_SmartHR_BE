import { AppDataSource } from '../database/data-source.js';
import { ActionLogEntity } from '../models/entities/action-log.entity.js';

export class ActionLogsRepository {
  get repo() {
    return AppDataSource.getRepository(ActionLogEntity);
  }

  async findAll(paginationDto) {
    const {
      skip,
      limit,
      search,
      actionType,
      userId,
      targetTable,
      fromDate,
      toDate,
      status,
    } = paginationDto;
    const baseQuery = this.repo
      .createQueryBuilder('actionLog')
      .leftJoinAndSelect('actionLog.user', 'user')
      .where('actionLog.deletedAt IS NULL');
    if (search) {
      baseQuery.andWhere(
        '(user.username LIKE :search OR user.email LIKE :search)',
        { search: `%${search}%` },
      );
    }
    if (actionType) {
      baseQuery.andWhere('actionLog.actionType = :actionType', { actionType });
    }
    if (userId) {
      baseQuery.andWhere('actionLog.userId = :userId', { userId });
    }
    if (targetTable) {
      baseQuery.andWhere('actionLog.targetTable = :targetTable', {
        targetTable,
      });
    }
    if (status) {
      baseQuery.andWhere('actionLog.status = :status', { status });
    }
    if (fromDate) {
      const [d, m, y] = fromDate.split('/');
      baseQuery.andWhere('actionLog.createdAt >= :fromDate', {
        fromDate: `${y}-${m}-${d} 00:00:00`,
      });
    }
    if (toDate) {
      const [d, m, y] = toDate.split('/');
      baseQuery.andWhere('actionLog.createdAt <= :toDate', {
        toDate: `${y}-${m}-${d} 23:59:59`,
      });
    }
    baseQuery
      .orderBy('actionLog.createdAt', 'DESC')
      .skip(skip || 0)
      .take(limit || 10);
    const [data, total] = await baseQuery.getManyAndCount();

    return [data, total];
  }

  async findById(id) {
    return this.repo.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  async create(data) {
    const log = this.repo.create(data);
    return this.repo.save(log);
  }
}
