import { ShiftGroupsService } from '../shift-groups.service.js';
import { ShiftGroupsRepository } from '../../repositories/shift-groups.repository.js';

jest.mock('../../repositories/shift-groups.repository.js', () => ({
  ShiftGroupsRepository: jest.fn(),
}));

describe('ShiftGroupsService', () => {
  let service;
  let shiftGroupsRepo;

  beforeEach(() => {
    jest.clearAllMocks();

    shiftGroupsRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      hasShifts: jest.fn(),
      softDelete: jest.fn(),
    };

    ShiftGroupsRepository.mockImplementation(() => shiftGroupsRepo);
    service = new ShiftGroupsService();
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

  it('maps pagination parameters when listing groups', async () => {
    shiftGroupsRepo.findAll.mockResolvedValue({ items: [{ id: 1 }], total: 1 });

    const result = await service.findAll({
      page: 3,
      limit: 10,
      search: 'Office',
      status: 'active',
    });

    expect(shiftGroupsRepo.findAll).toHaveBeenCalledWith({
      skip: 20,
      take: 10,
      search: 'Office',
      status: 'active',
    });
    expect(result).toEqual({ items: [{ id: 1 }], total: 1 });
  });

  it('throws NotFoundException when group is missing', async () => {
    shiftGroupsRepo.findById.mockResolvedValue(null);

    await expectRejectWithStatus(service.findById(500), 404);
  });

  it('throws ConflictException on duplicate group name during create', async () => {
    shiftGroupsRepo.findAll.mockResolvedValue({ items: [{ id: 2 }], total: 1 });

    await expectRejectWithStatus(
      service.create({ groupName: 'Ca hành chính' }),
      409,
    );
    expect(shiftGroupsRepo.create).not.toHaveBeenCalled();
  });

  it('throws ConflictException when inactivating group that still has shifts', async () => {
    shiftGroupsRepo.findById.mockResolvedValue({
      id: 11,
      groupName: 'Shift A',
      status: 'active',
    });
    shiftGroupsRepo.hasShifts.mockResolvedValue(true);

    await expectRejectWithStatus(
      service.update(11, { status: 'inactive' }),
      409,
    );
    expect(shiftGroupsRepo.update).not.toHaveBeenCalled();
  });

  it('updates group when validations pass', async () => {
    shiftGroupsRepo.findById.mockResolvedValue({
      id: 15,
      groupName: 'Old Name',
      status: 'active',
    });
    shiftGroupsRepo.findAll.mockResolvedValue({ items: [], total: 0 });
    shiftGroupsRepo.update.mockResolvedValue({ id: 15, groupName: 'New Name' });

    const result = await service.update(15, { groupName: 'New Name' });

    expect(shiftGroupsRepo.update).toHaveBeenCalledWith(15, {
      groupName: 'New Name',
    });
    expect(result).toEqual({ id: 15, groupName: 'New Name' });
  });

  it('throws ConflictException when deleting group that has shifts', async () => {
    shiftGroupsRepo.findById.mockResolvedValue({ id: 21 });
    shiftGroupsRepo.hasShifts.mockResolvedValue(true);

    await expectRejectWithStatus(service.remove(21), 409);
    expect(shiftGroupsRepo.softDelete).not.toHaveBeenCalled();
  });

  it('soft deletes group when no shifts are attached', async () => {
    shiftGroupsRepo.findById.mockResolvedValue({ id: 21 });
    shiftGroupsRepo.hasShifts.mockResolvedValue(false);
    shiftGroupsRepo.softDelete.mockResolvedValue({ affected: 1 });

    const result = await service.remove(21);

    expect(shiftGroupsRepo.softDelete).toHaveBeenCalledWith(21);
    expect(result).toEqual({ affected: 1 });
  });
});
