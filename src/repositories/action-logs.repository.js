import { In } from 'typeorm';
import { AppDataSource } from '../database/data-source.js';
import { ActionLogEntity } from '../models/entities/action-log.entity.js';

/** Cho phép lọc theo một hoặc nhiều bảng (query: targetTable=a,b) */
const KNOWN_TARGET_TABLES = new Set([
  'timesheets',
  'processed_attendance_records',
  'employees',
  'users',
  'departments',
]);
const SORT_MAPPING = {
  createdAt: 'actionLog.createdAt',
  updatedAt: 'actionLog.updatedAt',
  status: 'actionLog.status',
  actionType: 'actionLog.actionType',
  userName: 'user.username',
};

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
      sortBy,
      sortOrder,
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
    console.log(targetTables);
    if (targetTables?.length === 1) {
      console.log(targetTables[0]);
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
      baseQuery.andWhere('actionLog.createdAt >= :fromDate', {
        fromDate: `${fromDate} 00:00:00`,
      });
    }

    if (toDate) {
      baseQuery.andWhere('actionLog.createdAt <= :toDate', {
        toDate: `${toDate} 23:59:59`,
      });
    }
    const sortColumn =
      SORT_MAPPING[sortBy] || 'actionLog.createdAt';
    const order = sortOrder === 'ASC' ? 'ASC' : 'DESC';
    baseQuery
      .orderBy(sortColumn, order)
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

  /**
   * Lấy log điểm danh (check_in, check_out, join) với đầy đủ thông tin nhân viên
   * Dùng cho bảng tổng hợp ở màn Attendance Blocking
   */
  async findAttendanceLogs({ page = 1, limit = 10, search, actionType, status } = {}) {
    const skip = (page - 1) * limit;
    const ACTION_TYPES = ['check_in', 'check_out'];

    const qb = this.repo
      .createQueryBuilder('log')
      .leftJoin('employees', 'employee', 'employee.user_id = log.user_id AND employee.deleted_at IS NULL')
      .select([
        'log.id AS id',
        'log.action_type AS actionType',
        'log.status AS status',
        'log.error_message AS errorMessage',
        'log.evidence_image_url AS evidenceImageUrl',
        'log.request_ip AS requestIp',
        'log.created_at AS time',
        'log.user_id AS userId',
        'employee.id AS empId',
        'employee.full_name AS empFullName',
        'employee.employee_code AS empCode',
      ])
      .where('log.deleted_at IS NULL')
      .andWhere('log.action_type IN (:...actionTypes)', { actionTypes: ACTION_TYPES });

    if (actionType && ACTION_TYPES.includes(actionType)) {
      qb.andWhere('log.action_type = :actionType', { actionType });
    }

    if (search) {
      qb.andWhere(
        '(employee.full_name LIKE :search OR employee.employee_code LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      qb.andWhere('log.status = :status', { status });
    }

    const total = await qb.getCount();

    qb.orderBy('log.created_at', 'DESC').offset(skip).limit(limit);
    const raw = await qb.getRawMany();

    const items = raw.map((row) => ({
      id: row.id,
      actionType: row.actionType,
      status: row.status,
      time: row.time,
      requestIp: row.requestIp,
      errorMessage: row.errorMessage,
      evidenceImageUrl: row.evidenceImageUrl,
      userId: row.userId,
      empId: row.empId ?? null,
      empCode: row.empCode ?? null,
      empFullName: row.empFullName ?? null,
    }));

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
