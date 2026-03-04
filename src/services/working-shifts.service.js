import { WorkingShiftsRepository } from '../repositories/working-shifts.repository.js';
import {
  NotFoundException,
  ConflictException,
} from '../common/exceptions/index.js';
import { AppMessages } from '../common/constants/index.js';

export class WorkingShiftsService {
  constructor() {
    this.shiftRepo = new WorkingShiftsRepository();
  }

  async findAll(queryDto) {
    const { page = 1, limit = 10, groupId, search } = queryDto;
    const skip = (page - 1) * limit;
    const { items, total } = await this.shiftRepo.findAll({
      skip,
      take: limit,
      groupId,
      search,
    });
    return { items, total };
  }

  async findById(id) {
    const shift = await this.shiftRepo.findById(id);
    if (!shift) {
      throw new NotFoundException(AppMessages.Errors.General.NOT_FOUND);
    }
    return shift;
  }

  async create(createDto) {
    if (createDto.shiftName) {
      // ensure unique within group maybe
      const existing = await this.shiftRepo.findAll({
        search: createDto.shiftName,
        skip: 0,
        take: 1,
      });
      if (existing.items.length > 0) {
        throw new ConflictException(
          AppMessages.Errors.WorkingShift.ALREADY_EXISTS,
        );
      }
    }
    return this.shiftRepo.create(createDto);
  }

  async update(id, updateDto) {
    const shift = await this.findById(id);
    if (updateDto.shiftName && updateDto.shiftName !== shift.shiftName) {
      const existing = await this.shiftRepo.findAll({
        search: updateDto.shiftName,
        skip: 0,
        take: 1,
      });
      if (existing.items.some((s) => s.id !== id)) {
        throw new ConflictException(
          AppMessages.Errors.WorkingShift.ALREADY_EXISTS,
        );
      }
    }
    return this.shiftRepo.update(id, updateDto);
  }

  async remove(id) {
    const shift = await this.findById(id);
    return this.shiftRepo.softDelete(shift.id);
  }
}
