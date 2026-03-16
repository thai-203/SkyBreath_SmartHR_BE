import { ActionLogsRepository } from '../repositories/action-logs.repository.js';
import { NotFoundException } from '../common/exceptions/index.js';
import { AppMessages } from '../common/constants/index.js';
import { PaginatedResponseDto } from '../common/dto/index.js';
import { parseUserAgent } from '../common/utils/user-agent.util.js';
import { ExcelUtil } from '../common/utils/excel.util.js';
import { parse } from 'dotenv';
import { isAfter } from 'date-fns';

export class ActionLogsService {
  constructor(actionLogsRepository = new ActionLogsRepository()) {
    this.actionLogsRepository = actionLogsRepository;
  }

  async log(data) {
    return this.actionLogsRepository.create({
      userId: data.userId ?? null,
      actionType: data.actionType,
      targetTable: data.targetTable,
      targetRecordId: data.targetRecordId,
      beforeData: data.beforeData ?? null,
      afterData: data.afterData ?? null,
      changedFields: data.changedFields ?? null,
      description: data.description ?? null,
      requestIp: data.requestIp ?? null,
      userAgent: data.userAgent ?? null,
    });
  }

  validateDateRange(dto) {
    const { fromDate, toDate } = dto;

    if (!fromDate && !toDate) return;

    const now = new Date();

    const from = fromDate ? parse(fromDate, 'dd/MM/yyyy', new Date()) : null;

    const to = toDate ? parse(toDate, 'dd/MM/yyyy', new Date()) : null;

    if (from && isAfter(from, now)) {
      throw new BadRequestException('fromDate cannot be in the future');
    }

    if (to && isAfter(to, now)) {
      throw new BadRequestException('toDate cannot be in the future');
    }

    if (from && to && isAfter(from, to)) {
      throw new BadRequestException(
        'fromDate must be before or equal to toDate',
      );
    }
  }

  async findAll(paginationDto) {
    this.validateDateRange(paginationDto);
    const [audits, total] =
      await this.actionLogsRepository.findAll(paginationDto);

    const data = audits.map((a) => ({
      ...a,
      userAgent: parseUserAgent(a.userAgent),
    }));

    return new PaginatedResponseDto(data, total, paginationDto);
  }

  async findById(id) {
    const item = await this.actionLogsRepository.findById(id);

    if (!item) {
      throw new NotFoundException(AppMessages.Errors.General.NOT_FOUND);
    }

    return item;
  }

  async exportExcel() {
    const [items] = await this.actionLogsRepository.findAll({
      // page: 1,
      limit: 10000,
    });

    const statusLabels = {
      SUCCESS: 'Thành công',
      FAILED: 'Thất bại',
    };

    const data = items.map((log, index) => ({
      index: index + 1,
      username: log.user?.username || '',
      email: log.user?.email || '',
      actionType: log.actionType || '',
      targetTable: log.targetTable || '',
      targetId: log.targetRecordId || '',
      description: log.description || '',
      status: statusLabels[log.status] || log.status,
      ipAddress: log.requestIp || '',
      createdAt: log.createdAt
        ? new Date(log.createdAt).toLocaleString('vi-VN')
        : '',
    }));

    const columns = [
      { header: 'STT', key: 'index', width: 8 },
      { header: 'Username', key: 'username', width: 20 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Loại hành động', key: 'actionType', width: 20 },
      { header: 'Bảng dữ liệu', key: 'targetTable', width: 20 },
      { header: 'ID bản ghi', key: 'targetId', width: 15 },
      { header: 'Mô tả', key: 'description', width: 40 },
      { header: 'Trạng thái', key: 'status', width: 15 },
      { header: 'IP', key: 'ipAddress', width: 18 },
      { header: 'Thời gian', key: 'createdAt', width: 22 },
    ];

    return ExcelUtil.export(data, columns, 'Lịch sử thao tác hệ thống');
  }
}
