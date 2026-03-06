import { ShiftGroupsRepository } from '../repositories/shift-groups.repository.js';
import {
  NotFoundException,
  ConflictException,
} from '../common/exceptions/index.js';
import { AppMessages } from '../common/constants/index.js';

export class ShiftGroupsService {
  constructor() {
    this.shiftGroupsRepo = new ShiftGroupsRepository();
  }

  async findAll(queryDto) {
    const { page = 1, limit = 10, search } = queryDto;
    const skip = (page - 1) * limit;
    const { items, total } = await this.shiftGroupsRepo.findAll({
      skip,
      take: limit,
      search,
    });
    return { items, total };
  }

  async findById(id) {
    const group = await this.shiftGroupsRepo.findById(id);
    if (!group) {
      throw new NotFoundException(AppMessages.Errors.General.NOT_FOUND);
    }
    return group;
  }

  async create(createDto) {
    // check duplicate name
    const existing = await this.shiftGroupsRepo.findAll({
      search: createDto.groupName,
      skip: 0,
      take: 1,
    });
    if (existing.items.length > 0) {
      throw new ConflictException(AppMessages.Errors.ShiftGroup.ALREADY_EXISTS);
    }
    return this.shiftGroupsRepo.create(createDto);
  }

  async update(id, updateDto) {
    const group = await this.findById(id);
    if (updateDto.groupName && updateDto.groupName !== group.groupName) {
      const existing = await this.shiftGroupsRepo.findAll({
        search: updateDto.groupName,
        skip: 0,
        take: 1,
      });
      if (existing.items.some((g) => g.id !== id)) {
        throw new ConflictException(
          AppMessages.Errors.ShiftGroup.ALREADY_EXISTS,
        );
      }
    }
    return this.shiftGroupsRepo.update(id, updateDto);
  }

  async remove(id) {
    const group = await this.findById(id);
    return this.shiftGroupsRepo.softDelete(group.id);
  }
}
