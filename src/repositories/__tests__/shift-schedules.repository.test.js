import { ShiftSchedulesRepository } from '../shift-schedules.repository.js';
import { AppDataSource } from '../../database/data-source.js';

jest.mock('../../database/data-source.js', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

describe('ShiftSchedulesRepository', () => {
  let repository;
  let scheduleOrmRepo;
  let shiftOrmRepo;
  let qb;
  let shiftQb;

  beforeEach(() => {
    jest.clearAllMocks();

    qb = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([{ id: 1 }]),
    };

    shiftQb = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    scheduleOrmRepo = {
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
      update: jest.fn(async () => ({ affected: 1 })),
      createQueryBuilder: jest.fn(() => qb),
    };

    shiftOrmRepo = {
      createQueryBuilder: jest.fn(() => shiftQb),
    };

    AppDataSource.getRepository
      .mockReturnValueOnce(scheduleOrmRepo)
      .mockReturnValueOnce(shiftOrmRepo);
    repository = new ShiftSchedulesRepository();
  });

  it('returns empty array when bulkCreate input is empty', async () => {
    const result = await repository.bulkCreate([]);

    expect(result).toEqual([]);
    expect(scheduleOrmRepo.create).not.toHaveBeenCalled();
    expect(scheduleOrmRepo.save).not.toHaveBeenCalled();
  });

  it('creates and saves rows in bulkCreate', async () => {
    const rows = [{ assignmentId: 1, employeeId: 2, shiftId: 3 }];

    const result = await repository.bulkCreate(rows);

    expect(scheduleOrmRepo.create).toHaveBeenCalledWith(rows);
    expect(scheduleOrmRepo.save).toHaveBeenCalledWith(rows);
    expect(result).toEqual(rows);
  });

  it('soft deletes schedules by assignment id', async () => {
    await repository.softDeleteByAssignmentId(100);

    expect(scheduleOrmRepo.update).toHaveBeenCalledWith(
      { assignmentId: 100, isDeleted: false },
      expect.objectContaining({ isDeleted: true, deletedAt: expect.any(Date) }),
    );
  });

  it('builds query with provided filters in findAll', async () => {
    await repository.findAll({
      startDate: '2026-03-01',
      endDate: '2026-03-31',
      departmentId: '9',
      shiftId: '5',
      employeeId: '8',
      keyword: 'Nguyen',
    });

    expect(scheduleOrmRepo.createQueryBuilder).toHaveBeenCalledWith('schedule');
    expect(qb.andWhere).toHaveBeenCalledWith(
      'schedule.workDate >= :startDate',
      {
        startDate: '2026-03-01',
      },
    );
    expect(qb.andWhere).toHaveBeenCalledWith('schedule.workDate <= :endDate', {
      endDate: '2026-03-31',
    });
    expect(qb.andWhere).toHaveBeenCalledWith(
      '(schedule.departmentId = :departmentId OR employee.departmentId = :departmentId)',
      { departmentId: 9 },
    );
    expect(qb.andWhere).toHaveBeenCalledWith('schedule.shiftId = :shiftId', {
      shiftId: 5,
    });
    expect(qb.andWhere).toHaveBeenCalledWith(
      'schedule.employeeId = :employeeId',
      {
        employeeId: 8,
      },
    );
    expect(qb.andWhere).toHaveBeenCalledWith(
      '(employee.fullName LIKE :kw OR employee.employeeCode LIKE :kw)',
      { kw: '%Nguyen%' },
    );
    expect(qb.orderBy).toHaveBeenCalledWith('schedule.workDate', 'ASC');
    expect(qb.addOrderBy).toHaveBeenCalledWith('employee.fullName', 'ASC');
    expect(qb.getMany).toHaveBeenCalledTimes(1);
  });

  it('returns conflict when a planned shift overlaps existing shift on same day', async () => {
    shiftQb.getMany.mockResolvedValue([
      {
        id: 11,
        shiftName: 'Ca 1',
        startTime: '08:00:00',
        endTime: '12:00:00',
      },
    ]);

    qb.getMany.mockResolvedValue([
      {
        employeeId: 7,
        workDate: '2026-03-26',
        shiftId: 22,
        shift: {
          id: 22,
          shiftName: 'Ca 2',
          startTime: '10:00:00',
          endTime: '14:00:00',
        },
      },
    ]);

    const result = await repository.findFirstConflict([
      {
        employeeId: 7,
        shiftId: 11,
        workDate: '2026-03-26',
      },
    ]);

    expect(result).toEqual(
      expect.objectContaining({ employeeId: 7, shiftId: 22 }),
    );
  });

  it('allows same day assignment when shift times do not overlap', async () => {
    shiftQb.getMany.mockResolvedValue([
      {
        id: 11,
        shiftName: 'Ca sáng',
        startTime: '08:00:00',
        endTime: '12:00:00',
      },
    ]);

    qb.getMany.mockResolvedValue([
      {
        employeeId: 7,
        workDate: '2026-03-26',
        shiftId: 22,
        shift: {
          id: 22,
          shiftName: 'Ca chiều',
          startTime: '13:00:00',
          endTime: '17:00:00',
        },
      },
    ]);

    const result = await repository.findFirstConflict([
      {
        employeeId: 7,
        shiftId: 11,
        workDate: '2026-03-26',
      },
    ]);

    expect(result).toBeNull();
  });
});
