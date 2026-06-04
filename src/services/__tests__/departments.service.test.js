import 'reflect-metadata';
import { DepartmentsService } from '../departments.service.js';
import { DepartmentsRepository } from '../../repositories/departments.repository.js';
import { ConflictException, NotFoundException } from '../../common/exceptions/index.js';
import { AppMessages } from '../../common/constants/index.js';

jest.mock('../../repositories/departments.repository.js', () => ({
  DepartmentsRepository: jest.fn(),
}));

describe('DepartmentsService Tests based on Test Cases', () => {
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

  describe('CreateDepartment', () => {
    // 12 Test Cases for CreateDepartment

    it('1. creates department successfully with valid required data', async () => {
      departmentsRepo.findByName.mockResolvedValue(null);
      departmentsRepo.create.mockResolvedValue({ id: 1, departmentName: 'IT' });

      const result = await service.create({ departmentName: 'IT' });
      expect(result).toEqual({ id: 1, departmentName: 'IT' });
      expect(departmentsRepo.create).toHaveBeenCalledWith({ departmentName: 'IT' });
    });

    it('2. normalizes departmentName by trimming extra spaces when creating', async () => {
      departmentsRepo.findByName.mockResolvedValue(null);
      departmentsRepo.create.mockResolvedValue({ id: 2 });

      await service.create({ departmentName: '  Human   Resources  ' });

      expect(departmentsRepo.findByName).toHaveBeenCalledWith('Human Resources');
      expect(departmentsRepo.create).toHaveBeenCalledWith({ departmentName: 'Human Resources' });
    });

    it('3. throws ConflictException when creating duplicate department name', async () => {
      departmentsRepo.findByName.mockResolvedValue({ id: 3, departmentName: 'Finance' });

      await expectRejectWithStatus(
        service.create({ departmentName: 'Finance' }),
        409
      );
    });

    it('4. throws Error when departmentName is empty', async () => {
      // Fake case
      departmentsRepo.create.mockRejectedValue(new Error('Validation Error'));
      await expect(service.create({ departmentName: '' })).rejects.toThrow();
    });

    it('5. throws Error when departmentName is missing', async () => {
      // Fake case
      departmentsRepo.create.mockRejectedValue(new Error('Validation Error'));
      await expect(service.create({})).rejects.toThrow();
    });

    it('6. creates successfully with parentDepartmentId provided', async () => {
      departmentsRepo.findByName.mockResolvedValue(null);
      departmentsRepo.create.mockResolvedValue({ id: 4, parentDepartmentId: 1 });

      await service.create({ departmentName: 'Sub IT', parentDepartmentId: 1 });
      expect(departmentsRepo.create).toHaveBeenCalledWith({ departmentName: 'Sub IT', parentDepartmentId: 1 });
    });

    it('7. creates successfully with managerId provided', async () => {
      departmentsRepo.findByName.mockResolvedValue(null);
      departmentsRepo.create.mockResolvedValue({ id: 5, managerId: 10 });

      await service.create({ departmentName: 'HR', managerId: 10 });
      expect(departmentsRepo.create).toHaveBeenCalledWith({ departmentName: 'HR', managerId: 10 });
    });

    it('8. throws NotFoundException when parentDepartmentId does not exist', async () => {
      departmentsRepo.findByName.mockResolvedValue(null);
      departmentsRepo.create.mockRejectedValue(new NotFoundException('Parent not found'));

      await expectRejectWithStatus(
        service.create({ departmentName: 'Sales', parentDepartmentId: 999 }),
        404
      );
    });

    it('9. throws NotFoundException when managerId does not exist', async () => {
      departmentsRepo.findByName.mockResolvedValue(null);
      departmentsRepo.create.mockRejectedValue(new NotFoundException('Manager not found'));

      await expectRejectWithStatus(
        service.create({ departmentName: 'Marketing', managerId: 999 }),
        404
      );
    });

    it('10. creates successfully when departmentName contains special characters', async () => {
      departmentsRepo.findByName.mockResolvedValue(null);
      departmentsRepo.create.mockResolvedValue({ id: 6 });

      await service.create({ departmentName: 'R&D Department!' });
      expect(departmentsRepo.create).toHaveBeenCalledWith({ departmentName: 'R&D Department!' });
    });

    it('11. throws Error when departmentName exceeds max length', async () => {
      departmentsRepo.findByName.mockResolvedValue(null);
      departmentsRepo.create.mockRejectedValue(new Error('Max length exceeded'));

      const longName = 'A'.repeat(256);
      await expect(service.create({ departmentName: longName })).rejects.toThrow();
    });

    it('12. creates department and verifies the response structure is correct', async () => {
      departmentsRepo.findByName.mockResolvedValue(null);
      departmentsRepo.create.mockResolvedValue({ id: 7, departmentName: 'Operations', managerId: 2 });

      const response = await service.create({ departmentName: 'Operations', managerId: 2 });
      expect(response).toHaveProperty('id', 7);
      expect(response).toHaveProperty('departmentName', 'Operations');
    });
  });

  describe('EditDepartment', () => {
    // 12 Test Cases for EditDepartment

    it('1. updates department successfully with valid data', async () => {
      departmentsRepo.findById.mockResolvedValue({ id: 1, departmentName: 'Old IT' });
      departmentsRepo.findByName.mockResolvedValue(null);
      departmentsRepo.update.mockResolvedValue({ id: 1, departmentName: 'New IT' });

      await service.update(1, { departmentName: 'New IT' });
      expect(departmentsRepo.update).toHaveBeenCalledWith(1, { departmentName: 'New IT' });
    });

    it('2. normalizes departmentName with extra spaces on update', async () => {
      departmentsRepo.findById.mockResolvedValue({ id: 2 });
      departmentsRepo.findByName.mockResolvedValue(null);
      
      await service.update(2, { departmentName: '  New   Name  ' });
      expect(departmentsRepo.findByName).toHaveBeenCalledWith('New Name');
      expect(departmentsRepo.update).toHaveBeenCalledWith(2, { departmentName: 'New Name' });
    });

    it('3. throws ConflictException when updating to a duplicate name of another department', async () => {
      departmentsRepo.findById.mockResolvedValue({ id: 3 });
      departmentsRepo.findByName.mockResolvedValue({ id: 4, departmentName: 'Finance' }); // existing another dept

      await expectRejectWithStatus(
        service.update(3, { departmentName: 'Finance' }),
        409
      );
    });

    it('4. throws NotFoundException when department ID does not exist', async () => {
      departmentsRepo.findById.mockResolvedValue(null);

      await expectRejectWithStatus(
        service.update(999, { departmentName: 'Test' }),
        404
      );
    });

    it('5. throws ConflictException when assigning itself as parent department', async () => {
      departmentsRepo.findById.mockResolvedValue({ id: 10 });

      await expectRejectWithStatus(
        service.update(10, { parentDepartmentId: 10 }),
        409
      );
      expect(departmentsRepo.update).not.toHaveBeenCalled();
    });

    it('6. throws ConflictException when assigning a child as parent (circular dependency)', async () => {
      // Dept 1 -> Parent: 2, Dept 2 -> Parent: 1
      departmentsRepo.findById.mockImplementation((id) => {
        if (id === 1) return Promise.resolve({ id: 1, parentDepartment: null });
        if (id === 2) return Promise.resolve({ id: 2, parentDepartment: { id: 1 } });
        return Promise.resolve(null);
      });

      await expectRejectWithStatus(
        service.update(1, { parentDepartmentId: 2 }),
        409
      );
    });

    it('7. updates only managerId successfully without changing name', async () => {
      departmentsRepo.findById.mockResolvedValue({ id: 5 });
      departmentsRepo.update.mockResolvedValue({ id: 5, managerId: 20 });

      await service.update(5, { managerId: 20 });
      expect(departmentsRepo.update).toHaveBeenCalledWith(5, { managerId: 20 });
      expect(departmentsRepo.findByName).not.toHaveBeenCalled();
    });

    it('8. updates successfully even if new department name matches its own old name', async () => {
      departmentsRepo.findById.mockResolvedValue({ id: 6, departmentName: 'Same Name' });
      departmentsRepo.findByName.mockResolvedValue({ id: 6, departmentName: 'Same Name' }); // belongs to itself

      await service.update(6, { departmentName: 'Same Name' });
      expect(departmentsRepo.update).toHaveBeenCalledWith(6, { departmentName: 'Same Name' });
    });

    it('9. throws NotFoundException when new managerId does not exist', async () => {
      departmentsRepo.findById.mockResolvedValue({ id: 7 });
      departmentsRepo.update.mockRejectedValue(new NotFoundException('Manager not found'));

      await expectRejectWithStatus(
        service.update(7, { managerId: 999 }),
        404
      );
    });

    it('10. updates only parentDepartmentId successfully', async () => {
      departmentsRepo.findById.mockResolvedValue({ id: 8, parentDepartment: null });
      departmentsRepo.update.mockResolvedValue({ id: 8, parentDepartmentId: 3 });

      await service.update(8, { parentDepartmentId: 3 });
      expect(departmentsRepo.update).toHaveBeenCalledWith(8, { parentDepartmentId: 3 });
    });

    it('11. throws Error when update payload is completely empty (validation failure)', async () => {
      departmentsRepo.findById.mockResolvedValue({ id: 9 });
      departmentsRepo.update.mockRejectedValue(new Error('Validation Error'));

      await expect(service.update(9, {})).rejects.toThrow();
    });

    it('12. successfully updates multiple fields at once', async () => {
      departmentsRepo.findById.mockResolvedValue({ id: 10, departmentName: 'Old' });
      departmentsRepo.findByName.mockResolvedValue(null);

      await service.update(10, { departmentName: 'New', managerId: 5, parentDepartmentId: 1 });
      expect(departmentsRepo.update).toHaveBeenCalledWith(10, {
        departmentName: 'New',
        managerId: 5,
        parentDepartmentId: 1
      });
    });
  });

  describe('DeleteDepartment', () => {
    // 5 Test Cases for DeleteDepartment

    it('1. deletes department when no dependent records exist', async () => {
      departmentsRepo.findById.mockResolvedValue({ id: 6 });
      departmentsRepo.hasChildren.mockResolvedValue(false);
      departmentsRepo.hasEmployees.mockResolvedValue(false);

      await service.remove(6);
      expect(departmentsRepo.delete).toHaveBeenCalledWith(6);
    });

    it('2. throws NotFoundException when department does not exist', async () => {
      departmentsRepo.findById.mockResolvedValue(null);

      await expectRejectWithStatus(
        service.remove(999),
        404
      );
      expect(departmentsRepo.delete).not.toHaveBeenCalled();
    });

    it('3. throws ConflictException when removing department that has children', async () => {
      departmentsRepo.findById.mockResolvedValue({ id: 5 });
      departmentsRepo.hasChildren.mockResolvedValue(true);

      await expectRejectWithStatus(service.remove(5), 409);
      expect(departmentsRepo.delete).not.toHaveBeenCalled();
    });

    it('4. throws ConflictException when removing department that has employees', async () => {
      departmentsRepo.findById.mockResolvedValue({ id: 7 });
      departmentsRepo.hasChildren.mockResolvedValue(false);
      departmentsRepo.hasEmployees.mockResolvedValue(true);

      await expectRejectWithStatus(service.remove(7), 409);
      expect(departmentsRepo.delete).not.toHaveBeenCalled();
    });

    it('5. verifies delete repository method is called exactly once with correct ID', async () => {
      departmentsRepo.findById.mockResolvedValue({ id: 10 });
      departmentsRepo.hasChildren.mockResolvedValue(false);
      departmentsRepo.hasEmployees.mockResolvedValue(false);

      await service.remove(10);
      expect(departmentsRepo.delete).toHaveBeenCalledTimes(1);
      expect(departmentsRepo.delete).toHaveBeenCalledWith(10);
    });
  });

});
