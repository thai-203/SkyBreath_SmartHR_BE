import 'reflect-metadata';
import { RequestGroupsService } from '../request-groups.service.js';
import { RequestGroupsRepository } from '../../repositories/request-groups.repository.js';
import { RequestGroupWorkflowsRepository } from '../../repositories/request-group-workflows.repository.js';
import { RequestTypesRepository } from '../../repositories/request-types.repository.js';
import { NotFoundException, ConflictException, BadRequestException } from '../../common/exceptions/index.js';

jest.mock('../../repositories/request-groups.repository.js');
jest.mock('../../repositories/request-group-workflows.repository.js');
jest.mock('../../repositories/request-types.repository.js');

describe('RequestGroupsService Tests', () => {
  let service;
  let groupsRepo;
  let workflowRepo;
  let typesRepo;

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

    groupsRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByCodeWithDeleted: jest.fn(),
      findByName: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByIdWithDeleted: jest.fn()
    };
    RequestGroupsRepository.mockImplementation(() => groupsRepo);

    workflowRepo = {
      createMany: jest.fn(),
      deleteByGroupId: jest.fn()
    };
    RequestGroupWorkflowsRepository.mockImplementation(() => workflowRepo);

    typesRepo = {
      countByGroupId: jest.fn()
    };
    RequestTypesRepository.mockImplementation(() => typesRepo);

    service = new RequestGroupsService();
  });

  describe('Create Request Group', () => {
    it('1. successfully creates a new request group with valid basic data (no workflows)', async () => {
      groupsRepo.findByCodeWithDeleted.mockResolvedValue(null);
      groupsRepo.findByName.mockResolvedValue(null);
      groupsRepo.create.mockResolvedValue({ id: 1, name: 'Group 1' });
      groupsRepo.findById.mockResolvedValue({ id: 1, name: 'Group 1' });

      const result = await service.create({ code: 'GRP1', name: 'Group 1' });
      expect(result.id).toBe(1);
      expect(groupsRepo.create).toHaveBeenCalled();
    });

    it('2. throws ConflictException when group code already exists', async () => {
      groupsRepo.findByCodeWithDeleted.mockResolvedValue({ id: 2, code: 'EXISTS' });

      await expectRejectWithStatus(
        service.create({ code: 'EXISTS', name: 'New Group' }),
        409
      );
    });

    it('3. throws ConflictException when group name already exists', async () => {
      groupsRepo.findByCodeWithDeleted.mockResolvedValue(null);
      groupsRepo.findByName.mockResolvedValue({ id: 3, name: 'Existing Name' });

      await expectRejectWithStatus(
        service.create({ code: 'NEW', name: 'Existing Name' }),
        409
      );
    });

    it('4. throws BadRequestException when workflows have duplicate level orders', async () => {
      groupsRepo.findByCodeWithDeleted.mockResolvedValue(null);
      groupsRepo.findByName.mockResolvedValue(null);
      groupsRepo.create.mockResolvedValue({ id: 4 });

      await expectRejectWithStatus(
        service.create({
          code: 'WF1',
          name: 'WF Group',
          workflows: [
            { levelOrder: 1, approverType: 'DIRECT_MANAGER' },
            { levelOrder: 1, approverType: 'DIRECT_MANAGER' }
          ]
        }),
        400
      );
    });

    it('5. throws BadRequestException when multiple DIRECT_MANAGER approvers are configured', async () => {
      groupsRepo.findByCodeWithDeleted.mockResolvedValue(null);
      groupsRepo.findByName.mockResolvedValue(null);
      groupsRepo.create.mockResolvedValue({ id: 5 });

      await expectRejectWithStatus(
        service.create({
          code: 'WF2',
          name: 'WF Group 2',
          workflows: [
            { levelOrder: 1, approverType: 'DIRECT_MANAGER' },
            { levelOrder: 2, approverType: 'DIRECT_MANAGER' }
          ]
        }),
        400
      );
    });
  });

});
