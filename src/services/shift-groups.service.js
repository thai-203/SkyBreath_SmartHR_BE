import { ShiftGroupsRepository } from '../repositories/shift-groups.repository.js';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '../common/exceptions/index.js';
import { AppMessages } from '../common/constants/index.js';

export class ShiftGroupsService {
  constructor() {
    this.shiftGroupsRepo = new ShiftGroupsRepository();
  }

  async findAll(queryDto) {
    const { page = 1, limit = 10, search, status } = queryDto;
    const skip = (page - 1) * limit;
    const { items, total } = await this.shiftGroupsRepo.findAll({
      skip,
      take: limit,
      search,
      status,
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
    if (!createDto?.groupName || !String(createDto.groupName).trim()) {
      throw new BadRequestException('Tên nhóm ca không được để trống');
    }

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
    if (
      updateDto.groupName !== undefined &&
      (!updateDto.groupName || !String(updateDto.groupName).trim())
    ) {
      throw new BadRequestException('Tên nhóm ca không được để trống');
    }

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
    // if status becoming inactive, ensure no shifts exist
    if (updateDto.status === 'inactive') {
      const hasShifts = await this.shiftGroupsRepo.hasShifts(id);
      if (hasShifts) {
        throw new ConflictException(AppMessages.Errors.ShiftGroup.HAS_SHIFTS);
      }
    }

    return this.shiftGroupsRepo.update(id, updateDto);
  }

  async remove(id) {
    const group = await this.findById(id);

    const hasShifts = await this.shiftGroupsRepo.hasShifts(id);
    if (hasShifts) {
      throw new ConflictException(AppMessages.Errors.ShiftGroup.HAS_SHIFTS);
    }

    return this.shiftGroupsRepo.softDelete(group.id);
  }
}
