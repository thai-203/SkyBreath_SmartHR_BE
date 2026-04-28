import { ActionLogsRepository } from '../repositories/action-logs.repository.js';
import {
  NotFoundException,
  BadRequestException,
} from '../common/exceptions/index.js';
import { AppMessages } from '../common/constants/index.js';
import { PaginatedResponseDto } from '../common/dto/index.js';
import { parseUserAgent } from '../common/utils/user-agent.util.js';
import { ExcelUtil } from '../common/utils/excel.util.js';
import { parse, isAfter, isValid } from 'date-fns';

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
    const { fromDate, toDate, status, sortOrder, page, limit } = dto;

    const now = new Date();

    const parseAndValidateDate = (dateStr, fieldName) => {
      if (!dateStr) return null;
      if (dateStr instanceof Date) return dateStr;

      const parsed = parse(dateStr, 'dd/MM/yyyy', new Date());
      if (!isValid(parsed)) {
        throw new BadRequestException(
          `${fieldName === 'fromDate' ? 'Ngày bắt đầu' : 'Ngày kết thúc'} không hợp lệ`,
        );
      }
      if (isAfter(parsed, now)) {
        throw new BadRequestException(
          `${fieldName === 'fromDate' ? 'Ngày bắt đầu' : 'Ngày kết thúc'} không được vượt quá ngày hiện tại`,
        );
      }
      return parsed;
    };

    const from = parseAndValidateDate(fromDate, 'fromDate');
    const to = parseAndValidateDate(toDate, 'toDate');

    if (from && to && isAfter(from, to)) {
      throw new BadRequestException(
        'Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc',
      );
    }

    if (status && !['SUCCESS', 'FAILED'].includes(status)) {
      throw new BadRequestException('Trạng thái không hợp lệ');
    }

    if (sortOrder && !['ASC', 'DESC'].includes(sortOrder)) {
      throw new BadRequestException('Thứ tự sắp xếp không hợp lệ');
    }

    if (
      page !== undefined &&
      (!Number.isInteger(Number(page)) || Number(page) <= 0)
    ) {
      throw new BadRequestException('Trang không hợp lệ');
    }

    if (
      limit !== undefined &&
      (!Number.isInteger(Number(limit)) || Number(limit) <= 0)
    ) {
      throw new BadRequestException('Số lượng bản ghi không hợp lệ');
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
      page: 1,
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
