import 'reflect-metadata';
import { RequestTypesService } from '../request-types.service.js';
import { RequestTypesRepository } from '../../repositories/request-types.repository.js';
import { RequestTypePoliciesRepository } from '../../repositories/request-type-policies.repository.js';
import { RequestGroupsRepository } from '../../repositories/request-groups.repository.js';
import { NotFoundException, BadRequestException, ConflictException } from '../../common/exceptions/index.js';

jest.mock('../../repositories/request-types.repository.js');
jest.mock('../../repositories/request-type-policies.repository.js');
jest.mock('../../repositories/request-groups.repository.js');

describe('RequestTypesService Tests', () => {
  let service;
  let typesRepo;
  let policyRepo;
  let groupsRepo;

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

    typesRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByNameAndGroupWithDeleted: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByIdWithDeleted: jest.fn()
    };
    RequestTypesRepository.mockImplementation(() => typesRepo);

    policyRepo = {
      upsert: jest.fn(),
      deleteByTypeId: jest.fn()
    };
    RequestTypePoliciesRepository.mockImplementation(() => policyRepo);

    groupsRepo = {
      findById: jest.fn()
    };
    RequestGroupsRepository.mockImplementation(() => groupsRepo);

    service = new RequestTypesService();
  });

  describe('Create Request Type', () => {
    // 6 cases matching Excel

    it('1. successfully creates a new request type without policy', async () => {
      groupsRepo.findById.mockResolvedValue({ id: 1 });
      typesRepo.findByNameAndGroupWithDeleted.mockResolvedValue(null);
      typesRepo.create.mockResolvedValue({ id: 10, name: 'Type 1' });
      typesRepo.findById.mockResolvedValue({ id: 10, name: 'Type 1' });

      const result = await service.create({ name: 'Type 1', requestGroupId: 1 });
      expect(result.id).toBe(10);
      expect(typesRepo.create).toHaveBeenCalled();
      expect(policyRepo.upsert).not.toHaveBeenCalled();
    });

    it('2. successfully creates a new request type with policy and unlimited quantity', async () => {
      groupsRepo.findById.mockResolvedValue({ id: 1 });
      typesRepo.findByNameAndGroupWithDeleted.mockResolvedValue(null);
      typesRepo.create.mockResolvedValue({ id: 11 });
      typesRepo.findById.mockResolvedValue({ id: 11 });

      await service.create({
        name: 'Type 2',
        requestGroupId: 1,
        policy: { isUnlimited: true, maxQuantity: 5 }
      });

      expect(policyRepo.upsert).toHaveBeenCalledWith(11, expect.objectContaining({ maxQuantity: 0 }));
      expect(policyRepo.upsert).toHaveBeenCalledWith(11, expect.not.objectContaining({ isUnlimited: true }));
    });

    it('3. throws NotFoundException when parent request group does not exist', async () => {
      groupsRepo.findById.mockResolvedValue(null);
      
      await expectRejectWithStatus(
        service.create({ name: 'Type 3', requestGroupId: 99 }),
        404
      );
    });

    it('4. throws ConflictException when type name already exists within the same group', async () => {
      groupsRepo.findById.mockResolvedValue({ id: 1 });
      typesRepo.findByNameAndGroupWithDeleted.mockResolvedValue({ id: 12 });

      await expectRejectWithStatus(
        service.create({ name: 'Existing Type', requestGroupId: 1 }),
        409
      );
    });

    it('5. verifies that text is normalized during creation', async () => {
      groupsRepo.findById.mockResolvedValue({ id: 1 });
      typesRepo.findByNameAndGroupWithDeleted.mockResolvedValue(null);
      typesRepo.create.mockResolvedValue({ id: 13 });
      typesRepo.findById.mockResolvedValue({ id: 13 });

      await service.create({ name: '  Type    Space  ', requestGroupId: 1 });
      expect(typesRepo.findByNameAndGroupWithDeleted).toHaveBeenCalledWith('Type Space', 1);
    });

    it('6. handles repository errors gracefully during creation', async () => {
      groupsRepo.findById.mockResolvedValue({ id: 1 });
      typesRepo.findByNameAndGroupWithDeleted.mockResolvedValue(null);
      typesRepo.create.mockRejectedValue(new Error('DB error'));

      await expect(service.create({ name: 'Type', requestGroupId: 1 })).rejects.toThrow('DB error');
    });
  });

});
