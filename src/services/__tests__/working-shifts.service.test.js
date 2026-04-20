import { WorkingShiftsService } from '../working-shifts.service.js';
import { WorkingShiftsRepository } from '../../repositories/working-shifts.repository.js';
import { ShiftGroupsRepository } from '../../repositories/shift-groups.repository.js';
import { ShiftAssignmentsRepository } from '../../repositories/shift-assignments.repository.js';

jest.mock('../../repositories/working-shifts.repository.js', () => ({
  WorkingShiftsRepository: jest.fn(),
}));

jest.mock('../../repositories/shift-groups.repository.js', () => ({
  ShiftGroupsRepository: jest.fn(),
}));

jest.mock('../../repositories/shift-assignments.repository.js', () => ({
  ShiftAssignmentsRepository: jest.fn(),
}));

describe('WorkingShiftsService', () => {
  let service;
  let shiftRepo;
  let shiftGroupRepo;
  let shiftAssignRepo;

  beforeEach(() => {
    jest.clearAllMocks();

    shiftRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      findList: jest.fn(),
    };

    shiftGroupRepo = {
      findById: jest.fn(),
    };

    shiftAssignRepo = {
      hasAssignmentsByShiftId: jest.fn(),
    };

    WorkingShiftsRepository.mockImplementation(() => shiftRepo);
    ShiftGroupsRepository.mockImplementation(() => shiftGroupRepo);
    ShiftAssignmentsRepository.mockImplementation(() => shiftAssignRepo);

    service = new WorkingShiftsService();
  });

  const expectRejectWithStatus = async (promise, statusCode) => {
    try {
      await promise;
      throw new Error('Expected promise to reject');
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect(err.statusCode).toBe(statusCode);
    }
  };

  it('maps page and limit to repository pagination params', async () => {
    shiftRepo.findAll.mockResolvedValue({ items: [{ id: 1 }], total: 1 });

    const result = await service.findAll({
      page: 2,
      limit: 5,
      groupId: 10,
      search: 'Morning',
    });

    expect(shiftRepo.findAll).toHaveBeenCalledWith({
      skip: 5,
      take: 5,
      groupId: 10,
      search: 'Morning',
    });
    expect(result).toEqual({ items: [{ id: 1 }], total: 1 });
  });

  it('throws NotFoundException when shift does not exist', async () => {
    shiftRepo.findById.mockResolvedValue(null);

    await expectRejectWithStatus(service.findById(999), 404);
  });

  it('throws NotFoundException when creating shift with missing group', async () => {
    shiftGroupRepo.findById.mockResolvedValue(null);

    await expectRejectWithStatus(
      service.create({ shiftName: 'A', groupId: 22 }),
      404,
    );
    expect(shiftRepo.create).not.toHaveBeenCalled();
  });

  it('throws ConflictException when creating shift in inactive group', async () => {
    shiftGroupRepo.findById.mockResolvedValue({ id: 22, status: 'inactive' });

    await expectRejectWithStatus(
      service.create({ shiftName: 'A', groupId: 22 }),
      409,
    );
    expect(shiftRepo.create).not.toHaveBeenCalled();
  });

  it('throws ConflictException when creating duplicate shift name', async () => {
    shiftRepo.findAll.mockResolvedValue({ items: [{ id: 1 }], total: 1 });

    await expectRejectWithStatus(service.create({ shiftName: 'Morning' }), 409);
    expect(shiftRepo.create).not.toHaveBeenCalled();
  });

  it('updates shift when group and name are valid', async () => {
    shiftRepo.findById.mockResolvedValue({
      id: 5,
      shiftName: 'Old Name',
      groupId: 1,
    });
    shiftAssignRepo.hasAssignmentsByShiftId.mockResolvedValue(false);
    shiftGroupRepo.findById.mockResolvedValue({ id: 2, status: 'active' });
    shiftRepo.findAll.mockResolvedValue({ items: [], total: 0 });
    shiftRepo.update.mockResolvedValue({ id: 5, shiftName: 'New Name' });

    const result = await service.update(5, {
      shiftName: 'New Name',
      groupId: 2,
    });

    expect(shiftRepo.update).toHaveBeenCalledWith(5, {
      shiftName: 'New Name',
      groupId: 2,
    });
    expect(result).toEqual({ id: 5, shiftName: 'New Name' });
  });

  it('removes existing shift by soft delete', async () => {
    shiftRepo.findById.mockResolvedValue({ id: 7 });
    shiftAssignRepo.hasAssignmentsByShiftId.mockResolvedValue(false);
    shiftRepo.softDelete.mockResolvedValue({ affected: 1 });

    const result = await service.remove(7);

    expect(shiftRepo.softDelete).toHaveBeenCalledWith(7);
    expect(result).toEqual({ affected: 1 });
  });

  it('throws ConflictException when deleting shift assigned to employees', async () => {
    shiftRepo.findById.mockResolvedValue({ id: 8 });
    shiftAssignRepo.hasAssignmentsByShiftId.mockResolvedValue(true);

    await expectRejectWithStatus(service.remove(8), 409);
    expect(shiftRepo.softDelete).not.toHaveBeenCalled();
  });

  it('allows editing non-time fields for assigned shift', async () => {
    shiftRepo.findById.mockResolvedValue({
      id: 9,
      shiftName: 'Ca A',
      startTime: '08:00:00',
      endTime: '17:00:00',
      breakStartTime: '12:00:00',
      breakEndTime: '13:00:00',
      groupId: 1,
    });
    shiftAssignRepo.hasAssignmentsByShiftId.mockResolvedValue(true);
    shiftRepo.findAll.mockResolvedValue({ items: [], total: 0 });
    shiftRepo.update.mockResolvedValue({ id: 9, shiftName: 'Ca A1' });

    const result = await service.update(9, { shiftName: 'Ca A1' });

    expect(shiftRepo.update).toHaveBeenCalledWith(9, { shiftName: 'Ca A1' });
    expect(result).toEqual({ id: 9, shiftName: 'Ca A1' });
  });

  it('throws ConflictException when editing time window of assigned shift', async () => {
    shiftRepo.findById.mockResolvedValue({
      id: 10,
      shiftName: 'Ca B',
      startTime: '08:00:00',
      endTime: '17:00:00',
      breakStartTime: '12:00:00',
      breakEndTime: '13:00:00',
      groupId: 1,
    });
    shiftAssignRepo.hasAssignmentsByShiftId.mockResolvedValue(true);

    await expectRejectWithStatus(
      service.update(10, { startTime: '09:00:00' }),
      409,
    );
    expect(shiftRepo.update).not.toHaveBeenCalled();
  });
});
