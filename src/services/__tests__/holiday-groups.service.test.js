import 'reflect-metadata';
import { HolidayGroupService } from '../holiday-groups.service.js';
import { HolidayGroupRepository } from '../../repositories/holiday-groups.repository.js';
import { HolidayListRepository } from '../../repositories/holiday-list.repository.js';

jest.mock('../../repositories/holiday-groups.repository.js', () => ({
  HolidayGroupRepository: jest.fn(),
}));

jest.mock('../../repositories/holiday-list.repository.js', () => ({
  HolidayListRepository: jest.fn(),
}));

describe('HolidayGroupService', () => {
  let service;
  let holidayGroupRepo;
  let holidayListRepo;

  const expectRejectWithStatus = async (promise, statusCode) => {
    try {
      await promise;
      throw new Error('Expected promise to reject');
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect(err.statusCode).toBe(statusCode);
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();

    holidayGroupRepo = {
      findByCode: jest.fn(),
      findByYearAndScope: jest.fn(),
      findByNameYearScope: jest.fn(),
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    holidayListRepo = {
      create: jest.fn(),
    };

    HolidayGroupRepository.mockImplementation(() => holidayGroupRepo);
    HolidayListRepository.mockImplementation(() => holidayListRepo);

    service = new HolidayGroupService();
  });

  it('throws BadRequestException when required create fields are missing', async () => {
    await expectRejectWithStatus(service.create({ groupName: 'Tet' }), 400);
  });

  it('throws BadRequestException when creating duplicate groupCode', async () => {
    holidayGroupRepo.findByCode.mockResolvedValue({ id: 1 });

    await expectRejectWithStatus(
      service.create({
        groupName: 'Tet',
        groupCode: 'TET_2026',
        year: 2026,
      }),
      400,
    );
  });

  it('throws BadRequestException when update attempts to change stable groupCode', async () => {
    holidayGroupRepo.findById.mockResolvedValue({
      id: 10,
      groupCode: 'TET_2026',
      status: 'INACTIVE',
      year: 2026,
      applicableScope: 'GLOBAL',
      groupName: 'Tet Group',
    });

    await expectRejectWithStatus(
      service.update(10, { groupCode: 'NEW_CODE' }),
      400,
    );

    expect(holidayGroupRepo.update).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when deleting group that has holidays', async () => {
    holidayGroupRepo.findById.mockResolvedValue({
      id: 5,
      holidays: [{ id: 1 }],
    });

    await expectRejectWithStatus(service.delete(5), 400);
  });

  it('throws BadRequestException when inheriting into non-future year', async () => {
    holidayGroupRepo.findById.mockResolvedValue({ id: 1, year: 2026 });

    await expectRejectWithStatus(service.inheritForNextYear(1, 2026), 400);
  });

  it('inherits group and copies holidays with shifted dates', async () => {
    holidayGroupRepo.findById.mockResolvedValue({
      id: 3,
      groupName: 'Tet Group',
      groupCode: 'TET',
      year: 2026,
      applicableScope: 'GLOBAL',
      holidays: [
        {
          holidayName: 'Tet Holiday',
          holidayType: 'PUBLIC',
          isPaid: true,
          description: 'desc',
          startDate: '2026-02-01',
          endDate: '2026-02-03',
          employees: [{ id: 8 }],
          compensatoryDays: [
            {
              date: '2026-02-04',
              replacesDate: '2026-02-02',
            },
          ],
        },
      ],
    });
    holidayGroupRepo.findByNameYearScope.mockResolvedValue(null);
    holidayGroupRepo.create.mockResolvedValue({ id: 99 });

    const result = await service.inheritForNextYear(3, 2027);

    expect(result).toEqual({ id: 99 });
    expect(holidayGroupRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        groupCode: 'TET_2027',
        year: 2027,
        status: 'INACTIVE',
      }),
    );
    expect(holidayListRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        holidayGroupId: 99,
        startDate: '2027-02-01',
        endDate: '2027-02-03',
        employeeIds: [8],
      }),
    );
  });
});
