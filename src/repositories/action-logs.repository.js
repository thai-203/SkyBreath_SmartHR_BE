import { In } from 'typeorm';
import { AppDataSource } from '../database/data-source.js';
import { ActionLogEntity } from '../models/entities/action-log.entity.js';

/** Cho phép lọc theo một hoặc nhiều bảng (query: targetTable=a,b) */
const KNOWN_TARGET_TABLES = new Set([
  'timesheets',
  'processed_attendance_records',
]);

function resolveTargetTables(targetTable) {
  if (targetTable == null || targetTable === '') return null;
  const raw = String(targetTable)
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
  const allowed = raw.filter((t) => KNOWN_TARGET_TABLES.has(t));
  if (allowed.length === 0) return null;
  return allowed;
}

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
    const targetTables = resolveTargetTables(targetTable);
    if (targetTables?.length === 1) {
      baseQuery.andWhere('actionLog.targetTable = :targetTable', {
        targetTable: targetTables[0],
      });
    } else if (targetTables?.length > 1) {
      baseQuery.andWhere('actionLog.targetTable IN (:...targetTables)', {
        targetTables,
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
    const order = paginationDto.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    baseQuery
      .orderBy('actionLog.createdAt', order)
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

  async findRecentAttendanceLogs(userId, limit = 5) {
    return this.repo.find({
      where: { userId: userId, actionType: In(['check_in', 'check_out']) },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
