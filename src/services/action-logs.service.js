import { ActionLogsRepository } from '../repositories/action-logs.repository.js';
import { NotFoundException } from '../common/exceptions/index.js';
import { AppMessages } from '../common/constants/index.js';
import { PaginatedResponseDto } from '../common/dto/index.js';
import { parseUserAgent } from '../common/utils/user-agent.util.js';
export class ActionLogsService {
  constructor(actionLogsRepository = new ActionLogsRepository()) {
    this.actionLogsRepository = actionLogsRepository;
  }

  async findAll(paginationDto) {
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

  async create(data) {
    return this.actionLogsRepository.create(data);
  }
}
