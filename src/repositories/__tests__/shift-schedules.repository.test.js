import { ShiftSchedulesRepository } from '../shift-schedules.repository.js';
import { AppDataSource } from '../../database/data-source.js';

jest.mock('../../database/data-source.js', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

describe('ShiftSchedulesRepository', () => {
  let repository;
  let ormRepo;
  let qb;

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

    ormRepo = {
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => x),
      update: jest.fn(async () => ({ affected: 1 })),
      createQueryBuilder: jest.fn(() => qb),
    };

    AppDataSource.getRepository.mockReturnValue(ormRepo);
    repository = new ShiftSchedulesRepository();
  });

  it('returns empty array when bulkCreate input is empty', async () => {
    const result = await repository.bulkCreate([]);

    expect(result).toEqual([]);
    expect(ormRepo.create).not.toHaveBeenCalled();
    expect(ormRepo.save).not.toHaveBeenCalled();
  });

  it('creates and saves rows in bulkCreate', async () => {
    const rows = [{ assignmentId: 1, employeeId: 2, shiftId: 3 }];

    const result = await repository.bulkCreate(rows);

    expect(ormRepo.create).toHaveBeenCalledWith(rows);
    expect(ormRepo.save).toHaveBeenCalledWith(rows);
    expect(result).toEqual(rows);
  });

  it('soft deletes schedules by assignment id', async () => {
    await repository.softDeleteByAssignmentId(100);

    expect(ormRepo.update).toHaveBeenCalledWith(
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

    expect(ormRepo.createQueryBuilder).toHaveBeenCalledWith('schedule');
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
});
