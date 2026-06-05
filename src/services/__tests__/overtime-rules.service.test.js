import 'reflect-metadata';
import { OvertimeRulesService } from '../overtime-rules.service.js';
import { OvertimeRulesRepository } from '../../repositories/overtime-rules.repository.js';
import { AppDataSource } from '../../database/data-source.js';
import { NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '../../common/exceptions/index.js';
import { In } from 'typeorm';

jest.mock('../../repositories/overtime-rules.repository.js');
jest.mock('../../database/data-source.js', () => ({
  AppDataSource: {
    getRepository: jest.fn()
  }
}));

describe('OvertimeRulesService Tests', () => {
  let service;
  let rulesRepo;
  let mockTypeRepo;
  let mockDeptRepo;

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

    rulesRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      getUsageStatus: jest.fn(),
      findOverlapping: jest.fn(),
      activateWithAutoVersioning: jest.fn()
    };
    OvertimeRulesRepository.mockImplementation(() => rulesRepo);

    mockTypeRepo = { findOne: jest.fn() };
    mockDeptRepo = { find: jest.fn() };

    AppDataSource.getRepository.mockImplementation((entity) => {
      if (entity === require('../../models/entities/overtime-type.entity.js').OvertimeTypeEntity) return mockTypeRepo;
      if (entity === require('../../models/entities/department.entity.js').DepartmentEntity) return mockDeptRepo;
      return {};
    });

    service = new OvertimeRulesService();
  });

  describe('Create Overtime Rule', () => {
    it('1. successfully creates an overtime rule with valid basic data', async () => {
      rulesRepo.create.mockResolvedValue({ id: 1, name: 'Rule 1' });
      const result = await service.create({ name: 'Rule 1' });
      expect(result).toEqual({ id: 1, name: 'Rule 1' });
    });

    it('2. validates and creates when effectiveTo is not provided', async () => {
      rulesRepo.create.mockResolvedValue({ id: 2 });
      await service.create({ name: 'Rule 2', effectiveFrom: '2023-01-01' });
      expect(rulesRepo.create).toHaveBeenCalled();
    });

    it('3. throws BadRequestException when effectiveTo is before effectiveFrom', async () => {
      await expectRejectWithStatus(
        service.create({ effectiveFrom: '2023-12-31', effectiveTo: '2023-01-01' }),
        400
      );
    });

    it('4. throws NotFoundException when overtimeTypeId does not exist', async () => {
      mockTypeRepo.findOne.mockResolvedValue(null);
      await expectRejectWithStatus(
        service.create({ overtimeTypeId: 99 }),
        404
      );
    });

    it('5. throws BadRequestException when departmentIds contain invalid IDs', async () => {
      mockDeptRepo.find.mockResolvedValue([{ id: 1 }]);
      await expectRejectWithStatus(
        service.create({ departmentIds: [1, 2] }),
        400
      );
    });

    it('6. successfully creates rule when versionStatus is DRAFT without checking overlap', async () => {
      mockTypeRepo.findOne.mockResolvedValue({ id: 1 });
      rulesRepo.create.mockResolvedValue({ id: 3 });
      await service.create({ versionStatus: 'DRAFT', overtimeTypeId: 1, effectiveFrom: '2023-01-01' });
      expect(rulesRepo.findOverlapping).not.toHaveBeenCalled();
    });

    it('7. throws ConflictException when creating ACTIVE rule with overlapping dates and same department', async () => {
      mockTypeRepo.findOne.mockResolvedValue({ id: 1 });
      rulesRepo.findOverlapping.mockResolvedValue([{ name: 'Overlap Rule', overlappingDepartments: ['IT'] }]);
      await expectRejectWithStatus(
        service.create({ versionStatus: 'ACTIVE', overtimeTypeId: 1, effectiveFrom: '2023-01-01' }),
        409
      );
    });

    it('8. throws ConflictException when creating ACTIVE rule with overlapping dates and same overtime type globally', async () => {
      mockTypeRepo.findOne.mockResolvedValue({ id: 1 });
      rulesRepo.findOverlapping.mockResolvedValue([{ name: 'Global Rule', overlappingDepartments: [] }]);
      await expectRejectWithStatus(
        service.create({ versionStatus: 'ACTIVE', overtimeTypeId: 1, effectiveFrom: '2023-01-01' }),
        409
      );
    });

    it('9. successfully creates ACTIVE rule when dates do not overlap', async () => {
      mockTypeRepo.findOne.mockResolvedValue({ id: 1 });
      rulesRepo.findOverlapping.mockResolvedValue([]);
      rulesRepo.create.mockResolvedValue({ id: 4 });
      await service.create({ versionStatus: 'ACTIVE', overtimeTypeId: 1, effectiveFrom: '2023-01-01' });
      expect(rulesRepo.create).toHaveBeenCalled();
    });

    it('10. successfully creates ACTIVE rule when departments do not overlap', async () => {
      mockTypeRepo.findOne.mockResolvedValue({ id: 1 });
      mockDeptRepo.find.mockResolvedValue([{ id: 2 }]);
      rulesRepo.findOverlapping.mockResolvedValue([]);
      rulesRepo.create.mockResolvedValue({ id: 5 });
      await service.create({ versionStatus: 'ACTIVE', overtimeTypeId: 1, effectiveFrom: '2023-01-01', departmentIds: [2] });
      expect(rulesRepo.create).toHaveBeenCalled();
    });

    it('11. successfully creates ACTIVE rule when overtime type is different', async () => {
      mockTypeRepo.findOne.mockResolvedValue({ id: 2 });
      rulesRepo.findOverlapping.mockResolvedValue([]);
      rulesRepo.create.mockResolvedValue({ id: 6 });
      await service.create({ versionStatus: 'ACTIVE', overtimeTypeId: 2, effectiveFrom: '2023-01-01' });
      expect(rulesRepo.create).toHaveBeenCalled();
    });

    it('12. verifies all private validation methods are called appropriately', async () => {
      const spyValidateDates = jest.spyOn(service, '_validateDates');
      rulesRepo.create.mockResolvedValue({ id: 7 });
      await service.create({ name: 'Test' });
      expect(spyValidateDates).toHaveBeenCalled();
    });

    it('13. verifies repository create is called with correct data', async () => {
      const data = { name: 'Specific Rule', versionStatus: 'DRAFT' };
      rulesRepo.create.mockResolvedValue({ id: 8, ...data });
      await service.create(data);
      expect(rulesRepo.create).toHaveBeenCalledWith(data);
    });

    it('14. handles errors thrown by the repository during creation', async () => {
      rulesRepo.create.mockRejectedValue(new Error('DB Error'));
      await expect(service.create({ name: 'Error Rule' })).rejects.toThrow('DB Error');
    });
  });

  describe('Edit Overtime Rule', () => {
    it('1. successfully updates an existing overtime rule with valid data', async () => {
      rulesRepo.findById.mockResolvedValue({ id: 1, versionStatus: 'DRAFT' });
      rulesRepo.getUsageStatus.mockResolvedValue({ hasPayroll: false, hasRequests: false });
      rulesRepo.update.mockResolvedValue({ id: 1, name: 'Updated' });
      
      await service.update(1, { name: 'Updated' });
      expect(rulesRepo.update).toHaveBeenCalledWith(1, { name: 'Updated' });
    });

    it('2. throws NotFoundException when rule ID does not exist', async () => {
      rulesRepo.findById.mockResolvedValue(null);
      await expectRejectWithStatus(service.update(99, { name: 'Test' }), 404);
    });

    it('3. throws BadRequestException when changing from ACTIVE to DRAFT', async () => {
      rulesRepo.findById.mockResolvedValue({ id: 2, versionStatus: 'ACTIVE' });
      await expectRejectWithStatus(service.update(2, { versionStatus: 'DRAFT' }), 400);
    });

    it('4. throws BadRequestException when effectiveTo is before effectiveFrom on update', async () => {
      rulesRepo.findById.mockResolvedValue({ id: 3, effectiveFrom: '2023-12-31' });
      await expectRejectWithStatus(service.update(3, { effectiveTo: '2023-01-01' }), 400);
    });

    it('5. throws NotFoundException when new overtimeTypeId does not exist', async () => {
      rulesRepo.findById.mockResolvedValue({ id: 4, overtimeTypeId: 1 });
      mockTypeRepo.findOne.mockResolvedValue(null);
      await expectRejectWithStatus(service.update(4, { overtimeTypeId: 2 }), 404);
    });

    it('6. throws BadRequestException when new departmentIds contain invalid IDs', async () => {
      rulesRepo.findById.mockResolvedValue({ id: 5 });
      mockDeptRepo.find.mockResolvedValue([]);
      await expectRejectWithStatus(service.update(5, { departmentIds: [99] }), 400);
    });

    it('7. throws ForbiddenException when updating critical fields of a rule used in payroll', async () => {
      rulesRepo.findById.mockResolvedValue({ id: 6, salaryMultiplier: 1.5 });
      rulesRepo.getUsageStatus.mockResolvedValue({ hasPayroll: true });
      await expectRejectWithStatus(service.update(6, { salaryMultiplier: 2.0 }), 403);
    });

    it('8. throws ForbiddenException when updating critical fields of a rule that has requests', async () => {
      rulesRepo.findById.mockResolvedValue({ id: 7, maxHoursPerDay: 4 });
      rulesRepo.getUsageStatus.mockResolvedValue({ hasPayroll: false, hasRequests: true });
      await expectRejectWithStatus(service.update(7, { maxHoursPerDay: 8 }), 403);
    });

    it('9. successfully updates non-critical fields (like name, effectiveTo) even if used in requests', async () => {
      rulesRepo.findById.mockResolvedValue({ id: 8, name: 'Old' });
      rulesRepo.getUsageStatus.mockResolvedValue({ hasPayroll: false, hasRequests: true });
      rulesRepo.update.mockResolvedValue({ id: 8 });
      await service.update(8, { name: 'New Name', effectiveTo: '2024-01-01' });
      expect(rulesRepo.update).toHaveBeenCalled();
    });

    it('10. throws ConflictException when updating to ACTIVE causes overlap', async () => {
      rulesRepo.findById.mockResolvedValue({ id: 9, versionStatus: 'DRAFT', overtimeTypeId: 1 });
      rulesRepo.getUsageStatus.mockResolvedValue({ hasPayroll: false, hasRequests: false });
      rulesRepo.findOverlapping.mockResolvedValue([{ name: 'Overlap' }]);
      await expectRejectWithStatus(service.update(9, { versionStatus: 'ACTIVE', effectiveFrom: '2023-01-01' }), 409);
    });

    it('11. successfully updates to ACTIVE when no overlap exists', async () => {
      rulesRepo.findById.mockResolvedValue({ id: 10, versionStatus: 'DRAFT', overtimeTypeId: 1 });
      rulesRepo.getUsageStatus.mockResolvedValue({ hasPayroll: false, hasRequests: false });
      rulesRepo.findOverlapping.mockResolvedValue([]);
      rulesRepo.update.mockResolvedValue({ id: 10 });
      await service.update(10, { versionStatus: 'ACTIVE' });
      expect(rulesRepo.update).toHaveBeenCalled();
    });

    it('12. verifies usage status is checked before allowing updates', async () => {
      rulesRepo.findById.mockResolvedValue({ id: 11 });
      rulesRepo.getUsageStatus.mockResolvedValue({ hasPayroll: false, hasRequests: false });
      await service.update(11, { name: 'Check Usage' });
      expect(rulesRepo.getUsageStatus).toHaveBeenCalledWith(11);
    });

    it('13. verifies repository update is called with correct data', async () => {
      rulesRepo.findById.mockResolvedValue({ id: 12 });
      rulesRepo.getUsageStatus.mockResolvedValue({ hasPayroll: false, hasRequests: false });
      await service.update(12, { maxHoursPerMonth: 40 });
      expect(rulesRepo.update).toHaveBeenCalledWith(12, { maxHoursPerMonth: 40 });
    });

    it('14. successfully updates when only effectiveTo is changed for an active rule', async () => {
      rulesRepo.findById.mockResolvedValue({ id: 13, versionStatus: 'ACTIVE' });
      rulesRepo.getUsageStatus.mockResolvedValue({ hasPayroll: false, hasRequests: false });
      rulesRepo.findOverlapping.mockResolvedValue([]);
      await service.update(13, { effectiveTo: '2025-12-31' });
      expect(rulesRepo.update).toHaveBeenCalled();
    });
  });

  describe('Delete Overtime Rule', () => {
    it('1. successfully deletes a rule when it has no associated requests or payroll', async () => {
      rulesRepo.findById.mockResolvedValue({ id: 1 });
      rulesRepo.getUsageStatus.mockResolvedValue({ hasRequests: false, hasPayroll: false });
      await service.remove(1);
      expect(rulesRepo.delete).toHaveBeenCalledWith(1);
    });

    it('2. throws NotFoundException when trying to delete a non-existent rule', async () => {
      rulesRepo.findById.mockResolvedValue(null);
      await expectRejectWithStatus(service.remove(99), 404);
      expect(rulesRepo.delete).not.toHaveBeenCalled();
    });

    it('3. throws ForbiddenException when trying to delete a rule used in payroll', async () => {
      rulesRepo.findById.mockResolvedValue({ id: 3 });
      rulesRepo.getUsageStatus.mockResolvedValue({ hasRequests: false, hasPayroll: true });
      await expectRejectWithStatus(service.remove(3), 403);
      expect(rulesRepo.delete).not.toHaveBeenCalled();
    });

    it('4. throws ForbiddenException when trying to delete a rule that has requests', async () => {
      rulesRepo.findById.mockResolvedValue({ id: 4 });
      rulesRepo.getUsageStatus.mockResolvedValue({ hasRequests: true, hasPayroll: false });
      await expectRejectWithStatus(service.remove(4), 403);
      expect(rulesRepo.delete).not.toHaveBeenCalled();
    });

    it('5. verifies repository delete is called exactly once with correct ID', async () => {
      rulesRepo.findById.mockResolvedValue({ id: 5 });
      rulesRepo.getUsageStatus.mockResolvedValue({ hasRequests: false, hasPayroll: false });
      await service.remove(5);
      expect(rulesRepo.delete).toHaveBeenCalledTimes(1);
      expect(rulesRepo.delete).toHaveBeenCalledWith(5);
    });
  });

});
