import { RequestGroupsService } from '../request-groups.service.js';

// ─── Mock tất cả Repository ───────────────────────────────────────
jest.mock('../../repositories/request-groups.repository.js', () => ({
  RequestGroupsRepository: jest.fn().mockImplementation(() => ({
    findAll: jest.fn(),
    findById: jest.fn(),
    findByCode: jest.fn(),
    findByCodeWithDeleted: jest.fn(),
    findByName: jest.fn(),
    findByIdWithDeleted: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  })),
}));

jest.mock('../../repositories/request-group-workflows.repository.js', () => ({
  RequestGroupWorkflowsRepository: jest.fn().mockImplementation(() => ({
    findByGroupId: jest.fn(),
    deleteByGroupId: jest.fn(),
    createMany: jest.fn(),
  })),
}));

jest.mock('../../repositories/request-types.repository.js', () => ({
  RequestTypesRepository: jest.fn().mockImplementation(() => ({
    countByGroupId: jest.fn(),
  })),
}));

// ─── Helper: assert exception statusCode + message ────────────────
const expectHttpError = async (promise, statusCode, messageSubstring) => {
  try {
    await promise;
    throw new Error('Expected function to throw');
  } catch (error) {
    expect(error.statusCode).toBe(statusCode);
    if (messageSubstring) {
      expect(error.message).toContain(messageSubstring);
    }
  }
};

const expectSyncHttpError = (fn, statusCode, messageSubstring) => {
  try {
    fn();
    throw new Error('Expected function to throw');
  } catch (error) {
    expect(error.statusCode).toBe(statusCode);
    if (messageSubstring) {
      expect(error.message).toContain(messageSubstring);
    }
  }
};

// ─── Test Suite ───────────────────────────────────────────────────
describe('RequestGroupsService', () => {
  let service;
  let groupRepo;
  let workflowRepo;
  let typesRepo;

  // Dữ liệu mẫu
  const mockGroup = {
    id: 1,
    code: 'GRP-001',
    name: 'Nhóm nghỉ phép',
    status: 'ACTIVE',
    isDeleted: false,
    workflows: [],
    requestTypes: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RequestGroupsService();
    groupRepo = service.repository;
    workflowRepo = service.workflowRepo;
    typesRepo = service.typesRepo;
  });

  // ═══════════════════════════════════════════════════════════════
  //  findAll
  // ═══════════════════════════════════════════════════════════════
  describe('findAll', () => {
    it('should return paginated result', async () => {
      const items = [mockGroup];
      groupRepo.findAll.mockResolvedValue({ items, total: 1 });

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(groupRepo.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        includeDeleted: true,
      });
      expect(result.data).toEqual(items);
      expect(result.meta.totalItems).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('should pass default pagination when no params given', async () => {
      groupRepo.findAll.mockResolvedValue({ items: [], total: 0 });

      const result = await service.findAll({});

      expect(result.data).toEqual([]);
      expect(result.meta.totalItems).toBe(0);
    });

    it('should calculate totalPages correctly', async () => {
      groupRepo.findAll.mockResolvedValue({ items: [], total: 25 });

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.meta.totalPages).toBe(3); // ceil(25/10)
      expect(result.meta.hasNextPage).toBe(true);
      expect(result.meta.hasPrevPage).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  findById
  // ═══════════════════════════════════════════════════════════════
  describe('findById', () => {
    it('should return group when found', async () => {
      groupRepo.findById.mockResolvedValue(mockGroup);

      const result = await service.findById(1);

      expect(result).toEqual(mockGroup);
      expect(groupRepo.findById).toHaveBeenCalledWith(1);
    });

    it('should throw 404 when group not found', async () => {
      groupRepo.findById.mockResolvedValue(null);

      await expectHttpError(service.findById(999), 404);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  create
  // ═══════════════════════════════════════════════════════════════
  describe('create', () => {
    it('should create group successfully without workflows', async () => {
      groupRepo.findByCodeWithDeleted.mockResolvedValue(null);
      groupRepo.findByName.mockResolvedValue(null);
      groupRepo.create.mockResolvedValue({ id: 2 });
      groupRepo.findById.mockResolvedValue({ ...mockGroup, id: 2 });

      const result = await service.create({
        code: 'GRP-002',
        name: 'Nhóm tăng ca',
      });

      expect(groupRepo.findByCodeWithDeleted).toHaveBeenCalledWith('GRP-002');
      expect(groupRepo.findByName).toHaveBeenCalledWith('Nhóm tăng ca');
      expect(groupRepo.create).toHaveBeenCalledWith({
        code: 'GRP-002',
        name: 'Nhóm tăng ca',
      });
      expect(result.id).toBe(2);
    });

    it('should create group with workflows', async () => {
      groupRepo.findByCodeWithDeleted.mockResolvedValue(null);
      groupRepo.findByName.mockResolvedValue(null);
      groupRepo.create.mockResolvedValue({ id: 3 });
      groupRepo.findById.mockResolvedValue({ ...mockGroup, id: 3 });
      workflowRepo.createMany.mockResolvedValue([]);

      const workflows = [
        { levelOrder: 1, levelName: 'Cấp 1', approverType: 'DIRECT_MANAGER' },
        { levelOrder: 2, levelName: 'Cấp 2', approverType: 'ROLE', approverRoleId: 1, approverUserId: 10 },
      ];

      const result = await service.create({
        code: 'GRP-003',
        name: 'Nhóm công tác',
        workflows,
      });

      expect(workflowRepo.createMany).toHaveBeenCalledWith(
        workflows.map(wf => ({ ...wf, requestGroupId: 3 })),
      );
      expect(result.id).toBe(3);
    });

    it('should throw 409 when code already exists (including soft-deleted)', async () => {
      groupRepo.findByCodeWithDeleted.mockResolvedValue(mockGroup);

      await expectHttpError(
        service.create({ code: 'GRP-001', name: 'Nhóm mới' }),
        409,
        'Mã nhóm đơn từ đã tồn tại',
      );

      expect(groupRepo.create).not.toHaveBeenCalled();
    });

    it('should throw 409 when name already exists', async () => {
      groupRepo.findByCodeWithDeleted.mockResolvedValue(null);
      groupRepo.findByName.mockResolvedValue(mockGroup);

      await expectHttpError(
        service.create({ code: 'GRP-NEW', name: 'Nhóm nghỉ phép' }),
        409,
        'Tên nhóm đơn từ đã tồn tại',
      );

      expect(groupRepo.create).not.toHaveBeenCalled();
    });

    it('should normalize text (trim + collapse spaces) for code and name', async () => {
      groupRepo.findByCodeWithDeleted.mockResolvedValue(null);
      groupRepo.findByName.mockResolvedValue(null);
      groupRepo.create.mockResolvedValue({ id: 4 });
      groupRepo.findById.mockResolvedValue({ ...mockGroup, id: 4 });

      await service.create({
        code: '  GRP   004  ',
        name: '  Nhóm    nghỉ    phép  ',
      });

      expect(groupRepo.findByCodeWithDeleted).toHaveBeenCalledWith('GRP 004');
      expect(groupRepo.findByName).toHaveBeenCalledWith('Nhóm nghỉ phép');
      expect(groupRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'GRP 004',
          name: 'Nhóm nghỉ phép',
        }),
      );
    });

    it('should not call workflowRepo.createMany when workflows is undefined', async () => {
      groupRepo.findByCodeWithDeleted.mockResolvedValue(null);
      groupRepo.findByName.mockResolvedValue(null);
      groupRepo.create.mockResolvedValue({ id: 5 });
      groupRepo.findById.mockResolvedValue({ ...mockGroup, id: 5 });

      await service.create({ code: 'GRP-005', name: 'Test' });

      expect(workflowRepo.createMany).not.toHaveBeenCalled();
    });

    it('should not call workflowRepo.createMany when workflows is empty []', async () => {
      groupRepo.findByCodeWithDeleted.mockResolvedValue(null);
      groupRepo.findByName.mockResolvedValue(null);
      groupRepo.create.mockResolvedValue({ id: 6 });
      groupRepo.findById.mockResolvedValue({ ...mockGroup, id: 6 });

      await service.create({ code: 'GRP-006', name: 'Test2', workflows: [] });

      expect(workflowRepo.createMany).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  update
  // ═══════════════════════════════════════════════════════════════
  describe('update', () => {
    beforeEach(() => {
      groupRepo.findById.mockResolvedValue(mockGroup);
    });

    it('should update group basic info successfully', async () => {
      groupRepo.findByName.mockResolvedValue(null);

      const result = await service.update(1, { name: 'Nhóm cập nhật' });

      expect(groupRepo.update).toHaveBeenCalledWith(1, { name: 'Nhóm cập nhật' });
      expect(result).toEqual(mockGroup);
    });

    it('should strip code from updateDto (code is immutable)', async () => {
      groupRepo.findByName.mockResolvedValue(null);

      await service.update(1, { code: 'NEW-CODE', name: 'Nhóm mới' });

      // code phải bị loại bỏ, chỉ update name
      expect(groupRepo.update).toHaveBeenCalledWith(1, { name: 'Nhóm mới' });
    });

    it('should throw 409 when updated name conflicts with another group', async () => {
      groupRepo.findByName.mockResolvedValue({ id: 99, name: 'Nhóm trùng' });

      await expectHttpError(
        service.update(1, { name: 'Nhóm trùng' }),
        409,
        'Tên nhóm đơn từ đã tồn tại',
      );
    });

    it('should not check name conflict if name unchanged', async () => {
      // name giống với group hiện tại
      await service.update(1, { name: 'Nhóm nghỉ phép' });

      expect(groupRepo.findByName).not.toHaveBeenCalled();
    });

    it('should replace workflows when workflows array is provided', async () => {
      const workflows = [
        { levelOrder: 1, levelName: 'Cấp 1', approverType: 'DIRECT_MANAGER' },
      ];

      await service.update(1, { workflows });

      expect(workflowRepo.deleteByGroupId).toHaveBeenCalledWith(1);
      expect(workflowRepo.createMany).toHaveBeenCalledWith(
        workflows.map(wf => ({ ...wf, requestGroupId: 1 })),
      );
    });

    it('should clear all workflows when empty array is provided', async () => {
      await service.update(1, { workflows: [] });

      expect(workflowRepo.deleteByGroupId).toHaveBeenCalledWith(1);
      expect(workflowRepo.createMany).not.toHaveBeenCalled();
    });

    it('should not touch workflows when workflows is undefined', async () => {
      await service.update(1, { name: 'Nhóm cập nhật' });

      expect(workflowRepo.deleteByGroupId).not.toHaveBeenCalled();
      expect(workflowRepo.createMany).not.toHaveBeenCalled();
    });

    it('should normalize name text on update', async () => {
      groupRepo.findByName.mockResolvedValue(null);

      await service.update(1, { name: '  Nhóm    mới  ' });

      expect(groupRepo.update).toHaveBeenCalledWith(1, { name: 'Nhóm mới' });
    });

    it('should not call repo.update when no fields besides code/workflows', async () => {
      await service.update(1, { code: 'IGNORED' });

      // code bị xóa -> groupData rỗng -> không gọi update
      expect(groupRepo.update).not.toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  remove
  // ═══════════════════════════════════════════════════════════════
  describe('remove', () => {
    it('should soft-delete group when it has no child types', async () => {
      groupRepo.findById.mockResolvedValue(mockGroup);
      typesRepo.countByGroupId.mockResolvedValue(0);

      const result = await service.remove(1);

      expect(workflowRepo.deleteByGroupId).toHaveBeenCalledWith(1);
      expect(groupRepo.delete).toHaveBeenCalledWith(1);
      expect(result.message).toBe('Xoá nhóm đơn thành công');
    });

    it('should throw 409 when group has child request types', async () => {
      groupRepo.findById.mockResolvedValue(mockGroup);
      typesRepo.countByGroupId.mockResolvedValue(3);

      await expectHttpError(
        service.remove(1),
        409,
        'Không thể xóa Nhóm Đơn Từ đang chứa Loại Đơn',
      );

      expect(groupRepo.delete).not.toHaveBeenCalled();
    });

    it('should throw 404 when group does not exist', async () => {
      groupRepo.findById.mockResolvedValue(null);

      await expectHttpError(service.remove(999), 404);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  restore
  // ═══════════════════════════════════════════════════════════════
  describe('restore', () => {
    it('should restore a soft-deleted group', async () => {
      groupRepo.findByIdWithDeleted.mockResolvedValue({
        ...mockGroup,
        isDeleted: true,
      });

      const result = await service.restore(1);

      expect(groupRepo.update).toHaveBeenCalledWith(1, {
        isDeleted: false,
        deletedAt: null,
        status: 'INACTIVE',
      });
      expect(result.message).toBe('Khôi phục nhóm đơn thành công');
    });

    it('should throw 404 when group does not exist at all', async () => {
      groupRepo.findByIdWithDeleted.mockResolvedValue(null);

      await expectHttpError(service.restore(999), 404);
    });

    it('should throw 400 when group is not deleted', async () => {
      groupRepo.findByIdWithDeleted.mockResolvedValue({
        ...mockGroup,
        isDeleted: false,
      });

      await expectHttpError(service.restore(1), 400, 'chưa bị xoá');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  _validateWorkflowLevels
  // ═══════════════════════════════════════════════════════════════
  describe('_validateWorkflowLevels', () => {
    it('should pass validation for valid workflows', () => {
      const workflows = [
        { levelOrder: 1, levelName: 'Cấp 1', approverType: 'DIRECT_MANAGER' },
        { levelOrder: 2, levelName: 'Cấp 2', approverType: 'ROLE', approverRoleId: 1, approverUserId: 10 },
      ];

      expect(() => service._validateWorkflowLevels(workflows)).not.toThrow();
    });

    it('should throw 400 when levelOrder is duplicated', () => {
      const workflows = [
        { levelOrder: 1, levelName: 'Cấp 1', approverType: 'DIRECT_MANAGER' },
        { levelOrder: 1, levelName: 'Cấp 2', approverType: 'ROLE', approverRoleId: 1, approverUserId: 10 },
      ];

      expectSyncHttpError(
        () => service._validateWorkflowLevels(workflows),
        400,
        'levelOrder',
      );
    });

    it('should throw 400 when more than one DIRECT_MANAGER is configured', () => {
      const workflows = [
        { levelOrder: 1, levelName: 'Cấp 1', approverType: 'DIRECT_MANAGER' },
        { levelOrder: 2, levelName: 'Cấp 2', approverType: 'DIRECT_MANAGER' },
      ];

      expectSyncHttpError(
        () => service._validateWorkflowLevels(workflows),
        400,
        'tối đa 1 cấp Quản lý trực tiếp',
      );
    });

    it('should throw 400 when ROLE type is missing approverRoleId', () => {
      const workflows = [
        { levelOrder: 1, levelName: 'Cấp 1', approverType: 'ROLE', approverUserId: 10 },
      ];

      expectSyncHttpError(
        () => service._validateWorkflowLevels(workflows),
        400,
        'phải chọn vai trò duyệt',
      );
    });

    it('should throw 400 when ROLE type is missing approverUserId', () => {
      const workflows = [
        { levelOrder: 1, levelName: 'Cấp 1', approverType: 'ROLE', approverRoleId: 1 },
      ];

      expectSyncHttpError(
        () => service._validateWorkflowLevels(workflows),
        400,
        'phải chọn người duyệt cụ thể',
      );
    });

    it('should throw 400 when same approverUserId is used in multiple ROLE levels', () => {
      const workflows = [
        { levelOrder: 1, levelName: 'Cấp 1', approverType: 'ROLE', approverRoleId: 1, approverUserId: 10 },
        { levelOrder: 2, levelName: 'Cấp 2', approverType: 'ROLE', approverRoleId: 2, approverUserId: 10 },
      ];

      expectSyncHttpError(
        () => service._validateWorkflowLevels(workflows),
        400,
        'trùng lặp người duyệt',
      );
    });

    it('should allow single DIRECT_MANAGER with ROLE approvers', () => {
      const workflows = [
        { levelOrder: 1, levelName: 'Cấp 1', approverType: 'DIRECT_MANAGER' },
        { levelOrder: 2, levelName: 'Cấp 2', approverType: 'ROLE', approverRoleId: 1, approverUserId: 10 },
        { levelOrder: 3, levelName: 'Cấp 3', approverType: 'ROLE', approverRoleId: 2, approverUserId: 20 },
      ];

      expect(() => service._validateWorkflowLevels(workflows)).not.toThrow();
    });
  });
});
