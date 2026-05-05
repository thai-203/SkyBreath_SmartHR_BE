import 'reflect-metadata';
import { DepartmentsService } from '../departments.service.js';
import { DepartmentsRepository } from '../../repositories/departments.repository.js';

jest.mock('../../repositories/departments.repository.js', () => ({
  DepartmentsRepository: jest.fn(),
}));

describe('DepartmentsService', () => {
  let service;
  let departmentsRepo;

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

    departmentsRepo = {
      findByName: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      hasChildren: jest.fn(),
      hasEmployees: jest.fn(),
      delete: jest.fn(),
      findWithChildren: jest.fn(),
      findList: jest.fn(),
    };

    DepartmentsRepository.mockImplementation(() => departmentsRepo);
    service = new DepartmentsService();
  });

  it('normalizes departmentName when creating department', async () => {
    departmentsRepo.findByName.mockResolvedValue(null);
    departmentsRepo.create.mockResolvedValue({ id: 1 });

    await service.create({ departmentName: '  Human   Resources  ' });

    expect(departmentsRepo.findByName).toHaveBeenCalledWith('Human Resources');
    expect(departmentsRepo.create).toHaveBeenCalledWith({
      departmentName: 'Human Resources',
    });
  });

  it('throws ConflictException when creating duplicate department name', async () => {
    departmentsRepo.findByName.mockResolvedValue({ id: 2 });

    await expectRejectWithStatus(
      service.create({ departmentName: 'Finance' }),
      409,
    );
  });

  it('throws ConflictException when assigning itself as parent department', async () => {
    departmentsRepo.findById.mockResolvedValue({ id: 10 });

    await expectRejectWithStatus(
      service.update(10, { parentDepartmentId: 10 }),
      409,
    );

    expect(departmentsRepo.update).not.toHaveBeenCalled();
  });

  it('throws ConflictException when removing department that has children', async () => {
    departmentsRepo.findById.mockResolvedValue({ id: 5 });
    departmentsRepo.hasChildren.mockResolvedValue(true);

    await expectRejectWithStatus(service.remove(5), 409);
    expect(departmentsRepo.delete).not.toHaveBeenCalled();
  });

  it('deletes department when no dependent records exist', async () => {
    departmentsRepo.findById.mockResolvedValue({ id: 6 });
    departmentsRepo.hasChildren.mockResolvedValue(false);
    departmentsRepo.hasEmployees.mockResolvedValue(false);

    await service.remove(6);

    expect(departmentsRepo.delete).toHaveBeenCalledWith(6);
  });

  it('builds organization tree with aggregated employee counts', () => {
    const result = service.buildTree([
      {
        id: 1,
        parentDepartmentId: null,
        employeeCount: 2,
        probationCount: 1,
      },
      {
        id: 2,
        parentDepartmentId: 1,
        employeeCount: 3,
        probationCount: 2,
      },
    ]);

    expect(result).toHaveLength(1);
    expect(result[0].totalEmployeeCount).toBe(5);
    expect(result[0].totalProbationCount).toBe(3);
    expect(result[0].children).toHaveLength(1);
  });
});
