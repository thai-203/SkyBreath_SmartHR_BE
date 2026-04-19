import 'reflect-metadata';
import { ContractsService } from '../contracts.service.js';
import { ContractsRepository } from '../../repositories/contracts.repository.js';
import { EmployeesRepository } from '../../repositories/employees.repository.js';
import { AppDataSource } from '../../database/data-source.js';

jest.mock('../../repositories/contracts.repository.js', () => ({
  ContractsRepository: jest.fn(),
}));

jest.mock('../../repositories/employees.repository.js', () => ({
  EmployeesRepository: jest.fn(),
}));

jest.mock('../../database/data-source.js', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

describe('ContractsService', () => {
  let service;
  let contractsRepo;
  let employeesRepo;

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

    contractsRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByEmployeeId: jest.fn(),
      findByContractNumber: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    employeesRepo = {
      findById: jest.fn(),
    };

    ContractsRepository.mockImplementation(() => contractsRepo);
    EmployeesRepository.mockImplementation(() => employeesRepo);

    service = new ContractsService();
  });

  it('treats terminated contracts as non-blocking when creating a new contract', () => {
    const result = service._isBlockingContractForCreate({
      contractStatus: 'TERMINATED',
      isDeleted: false,
    });

    expect(result).toBe(false);
  });

  it('throws NotFoundException when employee does not exist on create', async () => {
    employeesRepo.findById.mockResolvedValue(null);

    await expectRejectWithStatus(service.create({ employeeId: 999 }), 404);
    expect(contractsRepo.create).not.toHaveBeenCalled();
  });

  it('throws ConflictException when employee already has active contract', async () => {
    employeesRepo.findById.mockResolvedValue({ id: 7 });
    contractsRepo.findByEmployeeId.mockResolvedValue([
      {
        id: 1,
        contractStatus: 'ACTIVE',
        isDeleted: false,
      },
    ]);

    await expectRejectWithStatus(
      service.create({
        employeeId: 7,
        departmentId: 1,
        positionId: 1,
        jobGradeId: 1,
        startDate: '2026-01-01',
      }),
      409,
    );
    expect(contractsRepo.create).not.toHaveBeenCalled();
  });

  it('throws BadRequestException when baseSalary is outside grade range', async () => {
    employeesRepo.findById.mockResolvedValue({ id: 7 });
    contractsRepo.findByEmployeeId.mockResolvedValue([]);

    AppDataSource.getRepository
      .mockReturnValueOnce({ findOne: jest.fn().mockResolvedValue({ id: 10 }) })
      .mockReturnValueOnce({ findOne: jest.fn().mockResolvedValue({ id: 20 }) })
      .mockReturnValueOnce({
        findOne: jest.fn().mockResolvedValue({
          id: 30,
          minSalary: 1000,
          maxSalary: 2000,
        }),
      });

    await expectRejectWithStatus(
      service.create({
        employeeId: 7,
        departmentId: 10,
        positionId: 20,
        jobGradeId: 30,
        startDate: '2026-01-01',
        baseSalary: 3000,
      }),
      400,
    );
  });

  it('throws BadRequestException when trying to change immutable contract number', async () => {
    contractsRepo.findById.mockResolvedValue({
      id: 8,
      contractNumber: 'HD-001',
      employeeId: 1,
    });

    await expectRejectWithStatus(
      service.update(8, {
        contractNumber: 'HD-NEW',
      }),
      400,
    );

    expect(contractsRepo.update).not.toHaveBeenCalled();
  });
});
