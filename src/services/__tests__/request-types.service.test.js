import { RequestTypesService } from '../request-types.service.js';

// ─── Mock tất cả Repository ───────────────────────────────────────
jest.mock('../../repositories/request-types.repository.js', () => ({
  RequestTypesRepository: jest.fn().mockImplementation(() => ({
    findAll: jest.fn(),
    findById: jest.fn(),
    findByNameAndGroup: jest.fn(),
    findByNameAndGroupWithDeleted: jest.fn(),
    findByIdWithDeleted: jest.fn(),
    countByGroupId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  })),
}));

jest.mock('../../repositories/request-type-policies.repository.js', () => ({
  RequestTypePoliciesRepository: jest.fn().mockImplementation(() => ({
    findByTypeId: jest.fn(),
    upsert: jest.fn(),
    deleteByTypeId: jest.fn(),
  })),
}));

jest.mock('../../repositories/request-groups.repository.js', () => ({
  RequestGroupsRepository: jest.fn().mockImplementation(() => ({
    findById: jest.fn(),
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

// ─── Test Suite ───────────────────────────────────────────────────
describe('RequestTypesService', () => {
  let service;
  let typeRepo;
  let policyRepo;
  let groupsRepo;

  const mockType = {
    id: 1,
    name: 'Nghỉ phép năm',
    status: 'ACTIVE',
    isDeleted: false,
    requestGroupId: 10,
    policy: null,
    requestGroup: { id: 10, name: 'Nhóm nghỉ phép' },
  };

  const mockGroup = {
    id: 10,
    name: 'Nhóm nghỉ phép',
    status: 'ACTIVE',
    isDeleted: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RequestTypesService();
    typeRepo = service.repository;
    policyRepo = service.policyRepo;
    groupsRepo = service.groupsRepo;
  });

  // ═══════════════════════════════════════════════════════════════
  //  findAll
  // ═══════════════════════════════════════════════════════════════
  describe('findAll', () => {
    it('should return paginated result with includeDeleted: true', async () => {
      const items = [mockType];
      typeRepo.findAll.mockResolvedValue({ items, total: 1 });

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(typeRepo.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        includeDeleted: true,
      });
      expect(result.data).toEqual(items);
      expect(result.meta.totalItems).toBe(1);
    });

    it('should return empty result', async () => {
      typeRepo.findAll.mockResolvedValue({ items: [], total: 0 });

      const result = await service.findAll({});

      expect(result.data).toEqual([]);
      expect(result.meta.totalItems).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  findById
  // ═══════════════════════════════════════════════════════════════
  describe('findById', () => {
    it('should return type when found', async () => {
      typeRepo.findById.mockResolvedValue(mockType);

      const result = await service.findById(1);

      expect(result).toEqual(mockType);
    });

    it('should throw 404 when type not found', async () => {
      typeRepo.findById.mockResolvedValue(null);

      await expectHttpError(service.findById(999), 404, 'Không tìm thấy Loại Đơn Từ');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  create
  // ═══════════════════════════════════════════════════════════════
  describe('create', () => {
    it('should create type successfully without policy', async () => {
      groupsRepo.findById.mockResolvedValue(mockGroup);
      typeRepo.findByNameAndGroupWithDeleted.mockResolvedValue(null);
      typeRepo.create.mockResolvedValue({ id: 2 });
      typeRepo.findById.mockResolvedValue({ ...mockType, id: 2 });

      const result = await service.create({
        name: 'Nghỉ tai nạn',
        requestGroupId: 10,
      });

      expect(groupsRepo.findById).toHaveBeenCalledWith(10);
      expect(typeRepo.create).toHaveBeenCalledWith({
        name: 'Nghỉ tai nạn',
        requestGroupId: 10,
      });
      expect(result.id).toBe(2);
    });

    it('should create type with policy', async () => {
      groupsRepo.findById.mockResolvedValue(mockGroup);
      typeRepo.findByNameAndGroupWithDeleted.mockResolvedValue(null);
      typeRepo.create.mockResolvedValue({ id: 3 });
      typeRepo.findById.mockResolvedValue({ ...mockType, id: 3 });
      policyRepo.upsert.mockResolvedValue({});

      const result = await service.create({
        name: 'Nghỉ ốm',
        requestGroupId: 10,
        policy: { maxQuantity: 12, unit: 'DAY', trackingCycle: 'YEAR', isUnlimited: false },
      });

      expect(policyRepo.upsert).toHaveBeenCalledWith(3, {
        maxQuantity: 12,
        unit: 'DAY',
        trackingCycle: 'YEAR',
      });
      expect(result.id).toBe(3);
    });

    it('should set maxQuantity to 0 when policy.isUnlimited is true', async () => {
      groupsRepo.findById.mockResolvedValue(mockGroup);
      typeRepo.findByNameAndGroupWithDeleted.mockResolvedValue(null);
      typeRepo.create.mockResolvedValue({ id: 4 });
      typeRepo.findById.mockResolvedValue({ ...mockType, id: 4 });
      policyRepo.upsert.mockResolvedValue({});

      await service.create({
        name: 'Nghỉ thai sản',
        requestGroupId: 10,
        policy: { maxQuantity: 99, unit: 'DAY', trackingCycle: 'YEAR', isUnlimited: true },
      });

      expect(policyRepo.upsert).toHaveBeenCalledWith(4, {
        maxQuantity: 0,
        unit: 'DAY',
        trackingCycle: 'YEAR',
      });
    });

    it('should throw 404 when parent group not found', async () => {
      groupsRepo.findById.mockResolvedValue(null);

      await expectHttpError(
        service.create({ name: 'Test', requestGroupId: 999 }),
        404,
        'Không tìm thấy Nhóm Đơn Từ cha',
      );
    });

    it('should throw 409 when name already exists in group (including deleted)', async () => {
      groupsRepo.findById.mockResolvedValue(mockGroup);
      typeRepo.findByNameAndGroupWithDeleted.mockResolvedValue(mockType);

      await expectHttpError(
        service.create({ name: 'Nghỉ phép năm', requestGroupId: 10 }),
        409,
        'Tên loại đơn từ này đã tồn tại',
      );
    });

    it('should normalize text (trim + collapse spaces) for name', async () => {
      groupsRepo.findById.mockResolvedValue(mockGroup);
      typeRepo.findByNameAndGroupWithDeleted.mockResolvedValue(null);
      typeRepo.create.mockResolvedValue({ id: 5 });
      typeRepo.findById.mockResolvedValue({ ...mockType, id: 5 });

      await service.create({
        name: '  Nghỉ    phép   năm  ',
        requestGroupId: 10,
      });

      expect(typeRepo.findByNameAndGroupWithDeleted).toHaveBeenCalledWith('Nghỉ phép năm', 10);
      expect(typeRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Nghỉ phép năm' }),
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  update
  // ═══════════════════════════════════════════════════════════════
  describe('update', () => {
    beforeEach(() => {
      typeRepo.findById.mockResolvedValue(mockType);
    });

    it('should update type basic info', async () => {
      typeRepo.findByNameAndGroupWithDeleted.mockResolvedValue(null);

      const result = await service.update(1, { name: 'Nghỉ cập nhật' });

      expect(typeRepo.update).toHaveBeenCalledWith(1, { name: 'Nghỉ cập nhật' });
    });

    it('should throw 404 when changing to non-existent group', async () => {
      groupsRepo.findById.mockResolvedValue(null);

      await expectHttpError(
        service.update(1, { requestGroupId: 999 }),
        404,
        'Không tìm thấy Nhóm Đơn Từ cha mục tiêu',
      );
    });

    it('should throw 400 when activating but parent group is deleted', async () => {
      groupsRepo.findById.mockResolvedValue({ ...mockGroup, isDeleted: true });
      typeRepo.findByNameAndGroupWithDeleted.mockResolvedValue(null);

      await expectHttpError(
        service.update(1, { status: 'ACTIVE' }),
        400,
        'Nhóm Đơn cha đã bị xoá',
      );
    });

    it('should throw 400 when activating but parent group is INACTIVE', async () => {
      groupsRepo.findById.mockResolvedValue({ ...mockGroup, status: 'INACTIVE', isDeleted: false });
      typeRepo.findByNameAndGroupWithDeleted.mockResolvedValue(null);

      await expectHttpError(
        service.update(1, { status: 'ACTIVE' }),
        400,
        'trạng thái không hoạt động',
      );
    });

    it('should throw 409 when duplicate name in group (excluding self)', async () => {
      typeRepo.findByNameAndGroupWithDeleted.mockResolvedValue({ id: 99, name: 'Trùng' });

      await expectHttpError(
        service.update(1, { name: 'Trùng' }),
        409,
        'Tên loại đơn từ này đã tồn tại',
      );
    });

    it('should remove policy when policy is null', async () => {
      typeRepo.findByNameAndGroupWithDeleted.mockResolvedValue(null);

      await service.update(1, { policy: null });

      expect(policyRepo.deleteByTypeId).toHaveBeenCalledWith(1);
    });

    it('should upsert policy when policy object is provided', async () => {
      typeRepo.findByNameAndGroupWithDeleted.mockResolvedValue(null);

      await service.update(1, {
        policy: { maxQuantity: 20, unit: 'DAY', isUnlimited: false },
      });

      expect(policyRepo.upsert).toHaveBeenCalledWith(1, {
        maxQuantity: 20,
        unit: 'DAY',
      });
    });

    it('should not touch policy when policy is undefined', async () => {
      typeRepo.findByNameAndGroupWithDeleted.mockResolvedValue(null);

      await service.update(1, { name: 'Cập nhật' });

      expect(policyRepo.upsert).not.toHaveBeenCalled();
      expect(policyRepo.deleteByTypeId).not.toHaveBeenCalled();
    });

    it('should normalize name on update', async () => {
      typeRepo.findByNameAndGroupWithDeleted.mockResolvedValue(null);

      await service.update(1, { name: '  Tên    mới  ' });

      expect(typeRepo.update).toHaveBeenCalledWith(1, { name: 'Tên mới' });
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  updatePolicy
  // ═══════════════════════════════════════════════════════════════
  describe('updatePolicy', () => {
    it('should upsert policy successfully', async () => {
      typeRepo.findById.mockResolvedValue(mockType);
      policyRepo.upsert.mockResolvedValue({});

      await service.updatePolicy(1, { maxQuantity: 15, unit: 'HOUR', isUnlimited: false });

      expect(policyRepo.upsert).toHaveBeenCalledWith(1, {
        maxQuantity: 15,
        unit: 'HOUR',
      });
    });

    it('should set maxQuantity to 0 when isUnlimited is true', async () => {
      typeRepo.findById.mockResolvedValue(mockType);
      policyRepo.upsert.mockResolvedValue({});

      await service.updatePolicy(1, { maxQuantity: 99, isUnlimited: true });

      expect(policyRepo.upsert).toHaveBeenCalledWith(1, { maxQuantity: 0 });
    });

    it('should throw 404 when type not found', async () => {
      typeRepo.findById.mockResolvedValue(null);

      await expectHttpError(
        service.updatePolicy(999, { maxQuantity: 10 }),
        404,
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  remove
  // ═══════════════════════════════════════════════════════════════
  describe('remove', () => {
    it('should soft-delete type and its policy', async () => {
      typeRepo.findById.mockResolvedValue(mockType);

      const result = await service.remove(1);

      expect(policyRepo.deleteByTypeId).toHaveBeenCalledWith(1);
      expect(typeRepo.delete).toHaveBeenCalledWith(1);
      expect(result.message).toBe('Xoá loại đơn thành công');
    });

    it('should throw 404 when type not found', async () => {
      typeRepo.findById.mockResolvedValue(null);

      await expectHttpError(service.remove(999), 404);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  restore
  // ═══════════════════════════════════════════════════════════════
  describe('restore', () => {
    it('should restore a soft-deleted type', async () => {
      typeRepo.findByIdWithDeleted.mockResolvedValue({ ...mockType, isDeleted: true });
      groupsRepo.findById.mockResolvedValue(mockGroup);

      const result = await service.restore(1);

      expect(typeRepo.update).toHaveBeenCalledWith(1, {
        isDeleted: false,
        deletedAt: null,
        status: 'INACTIVE',
      });
      expect(result.message).toBe('Khôi phục loại đơn thành công');
    });

    it('should throw 404 when type not found at all', async () => {
      typeRepo.findByIdWithDeleted.mockResolvedValue(null);

      await expectHttpError(service.restore(999), 404, 'Không tìm thấy Loại Đơn Từ');
    });

    it('should throw 400 when type is not deleted', async () => {
      typeRepo.findByIdWithDeleted.mockResolvedValue({ ...mockType, isDeleted: false });

      await expectHttpError(service.restore(1), 400, 'chưa bị xoá');
    });

    it('should throw 400 when parent group is deleted', async () => {
      typeRepo.findByIdWithDeleted.mockResolvedValue({ ...mockType, isDeleted: true });
      groupsRepo.findById.mockResolvedValue(null);

      await expectHttpError(
        service.restore(1),
        400,
        'Nhóm Đơn cha đã bị xoá',
      );
    });

    it('should throw 400 when parent group exists but is soft-deleted', async () => {
      typeRepo.findByIdWithDeleted.mockResolvedValue({ ...mockType, isDeleted: true });
      groupsRepo.findById.mockResolvedValue({ ...mockGroup, isDeleted: true });

      await expectHttpError(
        service.restore(1),
        400,
        'Nhóm Đơn cha đã bị xoá',
      );
    });
  });
});
