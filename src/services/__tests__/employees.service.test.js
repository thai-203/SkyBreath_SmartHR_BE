import 'reflect-metadata';
import { EmployeesService } from '../employees.service.js';
import { EmployeesRepository } from '../../repositories/employees.repository.js';
import { DepartmentsRepository } from '../../repositories/departments.repository.js';
import { AppDataSource } from '../../database/data-source.js';
import { ExcelUtil } from '../../common/utils/excel.util.js';

jest.mock('../../repositories/employees.repository.js', () => ({
  EmployeesRepository: jest.fn(),
}));

jest.mock('../../repositories/departments.repository.js', () => ({
  DepartmentsRepository: jest.fn(),
}));

jest.mock('../../database/data-source.js', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock('../../common/utils/excel.util.js', () => ({
  ExcelUtil: {
    export: jest.fn(),
  },
}));

jest.mock('../mail.service.js', () => ({
  mailService: {
    sendAccountInfo: jest.fn(),
  },
}));

describe('EmployeesService', () => {
  let service;
  let employeesRepo;
  let departmentsRepo;
  let positionRepo;
  let jobGradeRepo;

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

    employeesRepo = {
      findAll: jest.fn(),
      findByField: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      findDropdownList: jest.fn(),
      findValidationData: jest.fn(),
      getEmployeeNoPlanId: jest.fn(),
      getByUserId: jest.fn(),
      findByUserId: jest.fn(),
    };

    departmentsRepo = {
      findList: jest.fn(),
    };

    positionRepo = {
      find: jest.fn(),
    };

    jobGradeRepo = {
      find: jest.fn(),
    };

    EmployeesRepository.mockImplementation(() => employeesRepo);
    DepartmentsRepository.mockImplementation(() => departmentsRepo);

    const mockQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    };

    const mockUserRepo = {
      update: jest.fn().mockResolvedValue({}),
    };

    const mockEmployeeRepoForEntity = {
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
      findOne: jest.fn().mockResolvedValue(null),
    };

    AppDataSource.getRepository.mockImplementation((entity) => {
      if (entity?.name === 'PositionEntity') {
        return positionRepo;
      }
      if (entity?.name === 'JobGradeEntity') {
        return jobGradeRepo;
      }
      if (entity?.name === 'EmployeeEntity') {
        return mockEmployeeRepoForEntity;
      }
      if (entity?.name === 'UserEntity') {
        return mockUserRepo;
      }
      return {};
    });

    service = new EmployeesService(employeesRepo);
  });

  it('adds pagination metadata when listing employees', async () => {
    employeesRepo.findAll.mockResolvedValue({
      items: [{ id: 1 }],
      total: 25,
    });

    const result = await service.findAll({ page: 2, limit: 10 });

    expect(employeesRepo.findAll).toHaveBeenCalledWith({ page: 2, limit: 10 });
    expect(result).toEqual({
      items: [{ id: 1 }],
      total: 25,
      page: 2,
      limit: 10,
      totalPages: 3,
    });
  });

  it('rejects duplicate employee code on create', async () => {
    employeesRepo.findByField.mockResolvedValueOnce({ id: 99 });

    await expectRejectWithStatus(
      service.create({ employeeCode: 'EMP-001' }),
      409,
    );

    expect(employeesRepo.create).not.toHaveBeenCalled();
  });

  it('creates employee when all uniqueness checks pass', async () => {
    employeesRepo.findByField.mockResolvedValue(null);
    employeesRepo.create.mockResolvedValue({
      id: 10,
      fullName: 'New Employee',
    });

    const payload = {
      employeeCode: 'EMP-002',
      personalEmail: 'new.employee@example.com',
      phoneNumber: '0900000000',
      nationalId: '123456789',
    };

    const result = await service.create(payload);

    expect(employeesRepo.findByField).toHaveBeenCalledTimes(4);
    expect(employeesRepo.create).toHaveBeenCalledWith(payload);
    expect(result).toEqual({ id: 10, fullName: 'New Employee' });
  });

  it('loads metadata lists from repositories', async () => {
    positionRepo.find.mockResolvedValue([{ id: 1, positionName: 'Dev' }]);
    jobGradeRepo.find.mockResolvedValue([{ id: 2, gradeName: 'A' }]);
    departmentsRepo.findList.mockResolvedValue([
      { id: 3, departmentName: 'HR' },
    ]);
    employeesRepo.findDropdownList.mockResolvedValueOnce([
      { id: 4, fullName: 'Manager' },
    ]);
    employeesRepo.findDropdownList.mockResolvedValueOnce([
      { id: 5, fullName: 'Mentor' },
    ]);

    const result = await service.getMetadata();

    expect(positionRepo.find).toHaveBeenCalledWith({
      where: { isDeleted: false },
      order: { positionName: 'ASC' },
    });
    expect(jobGradeRepo.find).toHaveBeenCalledWith({
      where: { isDeleted: false },
      order: { gradeName: 'ASC' },
    });
    expect(result.departments).toEqual([{ id: 3, departmentName: 'HR' }]);
    expect(result.managers).toEqual([{ id: 4, fullName: 'Manager' }]);
    expect(result.hrMentors).toEqual([{ id: 5, fullName: 'Mentor' }]);
    expect(result.genderOptions).toHaveLength(3);
  });

  it('soft deletes an employee after validation', async () => {
    employeesRepo.findById.mockResolvedValue({ id: 7, fullName: 'Test', userId: 15 });
    employeesRepo.update.mockResolvedValue({ id: 7, employmentStatus: 'TERMINATED' });

    const result = await service.delete(7);

    expect(employeesRepo.update).toHaveBeenCalledWith(7, {
      employmentStatus: 'TERMINATED'
    });
    expect(result).toEqual({ affected: 1 });
  });

  it('exports employee rows to excel with mapped labels', async () => {
    employeesRepo.findAll.mockResolvedValue({
      items: [
        {
          employeeCode: 'EMP-001',
          fullName: 'Nguyen Van A',
          gender: 'MALE',
          maritalStatus: 'MARRIED',
          employmentStatus: 'ACTIVE',
          dateOfBirth: '1990-01-01',
          joinDate: '2024-01-01',
          department: { departmentName: 'HR' },
          position: { positionName: 'HR Specialist' },
          jobGrade: { gradeName: 'G1' },
        },
      ],
      total: 1,
    });
    ExcelUtil.export.mockResolvedValue('excel-buffer');

    const result = await service.exportExcel();

    expect(ExcelUtil.export).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ fullName: 'Nguyen Van A' }),
      ]),
      expect.arrayContaining([
        expect.objectContaining({ header: 'Họ và tên', key: 'fullName' }),
      ]),
      'Danh sách nhân viên',
    );
    expect(result).toBe('excel-buffer');
  });
});
