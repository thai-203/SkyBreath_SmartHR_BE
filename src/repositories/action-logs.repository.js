import { AppDataSource } from '../database/data-source.js';
import { ActionLogEntity } from '../models/entities/action-log.entity.js';

export class ActionLogsRepository {
  constructor() {
    this.actionLogRepository = AppDataSource.getRepository(ActionLogEntity);
  }

  async findAll(paginationDto) {
    const { skip, limit, actionType, userId, targetTable, startDate, endDate } =
      paginationDto;

    // 1️⃣ Lấy ID trước
    const idQuery = this.actionLogRepository
      .createQueryBuilder('actionLog')
      .select('actionLog.id')
      .where('actionLog.deletedAt IS NULL');

    if (actionType)
      idQuery.andWhere('actionLog.actionType = :actionType', { actionType });
    if (userId) idQuery.andWhere('actionLog.userId = :userId', { userId });
    if (targetTable)
      idQuery.andWhere('actionLog.targetTable = :targetTable', { targetTable });
    if (startDate)
      idQuery.andWhere('actionLog.createdAt >= :startDate', { startDate });
    if (endDate)
      idQuery.andWhere('actionLog.createdAt <= :endDate', { endDate });

    idQuery
      .orderBy('actionLog.createdAt', 'DESC')
      .skip(skip || 0)
      .take(limit || 10);

    const ids = (await idQuery.getRawMany()).map((r) => r.actionLog_id);

    if (!ids.length) return [[], 0];

    // 2️⃣ Lấy data (KHÔNG ORDER, KHÔNG JSON)
    const data = await this.actionLogRepository
      .createQueryBuilder('actionLog')
      .select([
        'actionLog.id',
        'actionLog.actionType',
        'actionLog.targetTable',
        'actionLog.description',
        'actionLog.createdAt',
        'actionLog.requestIp',
        'actionLog.userAgent',
        'user.id',
        'user.username',
        'user.email',
      ])
      .leftJoin('actionLog.user', 'user')
      .where('actionLog.id IN (:...ids)', { ids })
      .getMany();

    // 3️⃣ Sort lại theo ID
    const orderMap = new Map(ids.map((id, i) => [id, i]));
    data.sort((a, b) => orderMap.get(a.id) - orderMap.get(b.id));

    // 4️⃣ Count riêng
    const total = await this.actionLogRepository.count({
      where: {
        deletedAt: null,
        ...(actionType && { actionType }),
        ...(userId && { userId }),
        ...(targetTable && { targetTable }),
      },
    });

    return [data, total];
  }

  async findById(id) {
    return this.actionLogRepository.findOne({
      where: { id },
      relations: ['user'],
    });
  }

  async create(data) {
    const log = this.actionLogRepository.create(data);
    return this.actionLogRepository.save(log);
  }
}
