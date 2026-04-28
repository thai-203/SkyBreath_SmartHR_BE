import { RequestsService } from '../requests.service.js';
import { RequestStatus, ApprovalLevelStatus, ApproverType } from '../../common/enums/request.enum.js';

// ─── Mock tất cả dependencies ─────────────────────────────────────
jest.mock('../../repositories/requests.repository.js', () => ({
  RequestsRepository: jest.fn().mockImplementation(() => ({
    findById: jest.fn(),
    findAll: jest.fn(),
    findMyRequests: jest.fn(),
    findPendingForApprover: jest.fn(),
    findOverlappingRequests: jest.fn(),
    findUsedRequests: jest.fn(),
    findExcuseRequests: jest.fn(),
    findOvertimeDetailLinesForGroup: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    generateRequestCode: jest.fn(),
    getApprovalLevel: jest.fn(),
    getApprovalLevels: jest.fn(),
    updateApprovalLevel: jest.fn(),
    createApprovalLevels: jest.fn(),
    getAttachments: jest.fn(),
    createAttachments: jest.fn(),
    otdRepository: { update: jest.fn(), save: jest.fn(), create: jest.fn() },
  })),
}));

jest.mock('../../repositories/request-group-workflows.repository.js', () => ({
  RequestGroupWorkflowsRepository: jest.fn().mockImplementation(() => ({
    findByGroupId: jest.fn(),
  })),
}));

jest.mock('../../repositories/request-types.repository.js', () => ({
  RequestTypesRepository: jest.fn().mockImplementation(() => ({
    findById: jest.fn(),
  })),
}));

jest.mock('../../repositories/request-groups.repository.js', () => ({
  RequestGroupsRepository: jest.fn().mockImplementation(() => ({
    findById: jest.fn(),
    findByCode: jest.fn(),
  })),
}));

jest.mock('../../database/data-source.js', () => ({
  AppDataSource: {
    getRepository: jest.fn(() => ({
      findOne: jest.fn(),
    })),
  },
}));

jest.mock('../notifications.service.js', () => ({
  NotificationsService: jest.fn().mockImplementation(() => ({
    createAndNotify: jest.fn(),
    emitRemovePendingRequest: jest.fn(),
  })),
}));

jest.mock('../../common/helpers/working-days.helper.js', () => ({
  countWorkingDays: jest.fn().mockResolvedValue(5),
  getWorkingHoursForDay: jest.fn().mockResolvedValue(8),
  getRequestedHours: jest.fn().mockResolvedValue(4),
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
describe('RequestsService', () => {
  let service;
  let repo;
  let workflowRepo;
  let typeRepo;
  let groupsRepo;
  let notificationService;
  let employeeRepoMock;

  const mockEmployee = {
    id: 100,
    userId: 1,
    fullName: 'Nguyễn Văn A',
    isDeleted: false,
    directManagerId: 200,
  };

  const mockManager = {
    id: 200,
    userId: 2,
    fullName: 'Trần Văn B',
    isDeleted: false,
  };

  const mockReqUser = {
    id: 1,
    permissions: ['REQUEST_CREATE_FOR_OTHERS', 'REQUEST_VIEW_ALL', 'REQUEST_APPROVE'],
  };

  const mockRequest = {
    id: 1,
    requestCode: 'REQ-001',
    employeeId: 100,
    createdByEmployeeId: 100,
    requestTypeId: 10,
    requestGroupId: 20,
    status: RequestStatus.DRAFT,
    startDate: '2026-04-01',
    endDate: '2026-04-05',
    startTime: null,
    endTime: null,
    currentApprovalLevel: 1,
    totalApprovalLevels: 2,
    quantity: 5,
    description: 'Nghỉ phép',
  };

  const mockRequestType = {
    id: 10,
    name: 'Nghỉ phép năm',
    status: 'ACTIVE',
    requestGroupId: 20,
    policy: { unit: 'DAY', maxQuantity: 20, trackingCycle: 'YEAR', isWorkedTime: false },
    requestGroup: { id: 20, code: 'LEAVE', name: 'Nghỉ phép' },
  };

  const mockGroup = {
    id: 20,
    code: 'LEAVE',
    name: 'Nghỉ phép',
    status: 'ACTIVE',
    isDeleted: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RequestsService();
    repo = service.repo;
    workflowRepo = service.workflowRepo;
    typeRepo = service.typeRepo;
    groupsRepo = service.requestGroupsRepo;
    notificationService = service.notificationService;

    // Mock employeeRepo (lazy getter)
    employeeRepoMock = {
      findOne: jest.fn(),
    };
    service._employeeRepo = employeeRepoMock;
  });

  // ═══════════════════════════════════════════════════════════════
  //  _findRequestOrFail
  // ═══════════════════════════════════════════════════════════════
  describe('_findRequestOrFail', () => {
    it('should return request when found', async () => {
      repo.findById.mockResolvedValue(mockRequest);

      const result = await service._findRequestOrFail(1);

      expect(result).toEqual(mockRequest);
    });

    it('should throw 404 when request not found', async () => {
      repo.findById.mockResolvedValue(null);

      await expectHttpError(service._findRequestOrFail(999), 404, 'Không tìm thấy đơn từ');
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  _resolveApprover
  // ═══════════════════════════════════════════════════════════════
  describe('_resolveApprover', () => {
    it('should resolve DIRECT_MANAGER approver', async () => {
      employeeRepoMock.findOne.mockResolvedValue(mockManager);

      const wf = { approverType: ApproverType.DIRECT_MANAGER };
      const result = await service._resolveApprover(wf, mockEmployee);

      expect(result).toEqual(mockManager);
      expect(employeeRepoMock.findOne).toHaveBeenCalledWith({
        where: { id: 200, isDeleted: false },
      });
    });

    it('should return null when DIRECT_MANAGER but employee has no manager', async () => {
      const empNoManager = { ...mockEmployee, directManagerId: null };
      const wf = { approverType: ApproverType.DIRECT_MANAGER };

      const result = await service._resolveApprover(wf, empNoManager);

      expect(result).toBeNull();
    });

    it('should resolve ROLE approver by approverUserId', async () => {
      employeeRepoMock.findOne.mockResolvedValue(mockManager);

      const wf = { approverType: ApproverType.ROLE, approverUserId: 2 };
      const result = await service._resolveApprover(wf, mockEmployee);

      expect(employeeRepoMock.findOne).toHaveBeenCalledWith({
        where: { userId: 2, isDeleted: false },
      });
      expect(result).toEqual(mockManager);
    });

    it('should return null when ROLE but no approverUserId', async () => {
      const wf = { approverType: ApproverType.ROLE };
      const result = await service._resolveApprover(wf, mockEmployee);

      expect(result).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  cancelRequest
  // ═══════════════════════════════════════════════════════════════
  describe('cancelRequest', () => {
    it('should cancel a DRAFT request', async () => {
      repo.findById.mockResolvedValue({ ...mockRequest, status: RequestStatus.DRAFT });
      employeeRepoMock.findOne.mockResolvedValue(mockEmployee);

      const result = await service.cancelRequest(1, mockReqUser);

      expect(repo.update).toHaveBeenCalledWith(1, expect.objectContaining({
        status: RequestStatus.CANCELLED,
        cancelledByEmployeeId: 100,
      }));
      expect(result.message).toBe('Hủy đơn thành công');
    });

    it('should cancel a PENDING request when no level is APPROVED', async () => {
      repo.findById.mockResolvedValue({ ...mockRequest, status: RequestStatus.PENDING });
      employeeRepoMock.findOne.mockResolvedValue(mockEmployee);
      repo.getApprovalLevels.mockResolvedValue([
        { levelOrder: 1, status: ApprovalLevelStatus.PENDING, approverEmployeeId: 200 },
      ]);

      const result = await service.cancelRequest(1, mockReqUser);

      expect(result.message).toBe('Hủy đơn thành công');
    });

    it('should throw 403 when user is not the owner', async () => {
      repo.findById.mockResolvedValue({ ...mockRequest, status: RequestStatus.DRAFT });
      employeeRepoMock.findOne.mockResolvedValue({ ...mockEmployee, id: 300 });

      await expectHttpError(
        service.cancelRequest(1, mockReqUser),
        403,
        'không có quyền hủy đơn',
      );
    });

    it('should throw 400 when request is APPROVED', async () => {
      repo.findById.mockResolvedValue({ ...mockRequest, status: RequestStatus.APPROVED });
      employeeRepoMock.findOne.mockResolvedValue(mockEmployee);

      await expectHttpError(
        service.cancelRequest(1, mockReqUser),
        400,
        'Không thể hủy đơn ở trạng thái hiện tại',
      );
    });

    it('should throw 400 when PENDING but has APPROVED levels', async () => {
      repo.findById.mockResolvedValue({ ...mockRequest, status: RequestStatus.PENDING });
      employeeRepoMock.findOne.mockResolvedValue(mockEmployee);
      repo.getApprovalLevels.mockResolvedValue([
        { levelOrder: 1, status: ApprovalLevelStatus.APPROVED, approverEmployeeId: 200 },
      ]);

      await expectHttpError(
        service.cancelRequest(1, mockReqUser),
        400,
        'đã có cấp duyệt phê duyệt',
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  approveRequest
  // ═══════════════════════════════════════════════════════════════
  describe('approveRequest', () => {
    it('should approve and move to next level when not last level', async () => {
      const pendingRequest = {
        ...mockRequest,
        status: RequestStatus.PENDING,
        currentApprovalLevel: 1,
        totalApprovalLevels: 2,
      };
      repo.findById.mockResolvedValue(pendingRequest);
      employeeRepoMock.findOne.mockResolvedValue(mockManager);

      const currentLevel = {
        id: 50,
        levelOrder: 1,
        approverEmployeeId: 200,
        status: ApprovalLevelStatus.PENDING,
      };
      repo.getApprovalLevel.mockResolvedValue(currentLevel);
      repo.getApprovalLevels.mockResolvedValue([
        currentLevel,
        { id: 51, levelOrder: 2, approverEmployeeId: 300, status: ApprovalLevelStatus.PENDING },
      ]);

      await service.approveRequest(1, { id: 2 });

      // Update level to APPROVED
      expect(repo.updateApprovalLevel).toHaveBeenCalledWith(50, expect.objectContaining({
        status: ApprovalLevelStatus.APPROVED,
        actionedByEmployeeId: 200,
      }));

      // Move to next level
      expect(repo.update).toHaveBeenCalledWith(1, expect.objectContaining({
        currentApprovalLevel: 2,
      }));
    });

    it('should fully approve when last level', async () => {
      const pendingRequest = {
        ...mockRequest,
        status: RequestStatus.PENDING,
        currentApprovalLevel: 2,
        totalApprovalLevels: 2,
      };
      repo.findById.mockResolvedValue(pendingRequest);
      employeeRepoMock.findOne.mockResolvedValue(mockManager);

      const currentLevel = {
        id: 52,
        levelOrder: 2,
        approverEmployeeId: 200,
        status: ApprovalLevelStatus.PENDING,
      };
      repo.getApprovalLevel.mockResolvedValue(currentLevel);

      await service.approveRequest(1, { id: 2 });

      // Should set status to APPROVED
      expect(repo.update).toHaveBeenCalledWith(1, expect.objectContaining({
        status: RequestStatus.APPROVED,
      }));
    });

    it('should throw 400 when request is not PENDING', async () => {
      repo.findById.mockResolvedValue({ ...mockRequest, status: RequestStatus.DRAFT });
      employeeRepoMock.findOne.mockResolvedValue(mockManager);

      await expectHttpError(
        service.approveRequest(1, { id: 2 }),
        400,
        'không ở trạng thái chờ duyệt',
      );
    });

    it('should throw 403 when user is not the valid approver', async () => {
      repo.findById.mockResolvedValue({ ...mockRequest, status: RequestStatus.PENDING });
      employeeRepoMock.findOne.mockResolvedValue({ ...mockEmployee, id: 999 });

      const currentLevel = {
        id: 50,
        levelOrder: 1,
        approverEmployeeId: 200,
        status: ApprovalLevelStatus.PENDING,
      };
      repo.getApprovalLevel.mockResolvedValue(currentLevel);

      await expectHttpError(
        service.approveRequest(1, { id: 1 }),
        403,
        'không phải người duyệt hợp lệ',
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  rejectRequest
  // ═══════════════════════════════════════════════════════════════
  describe('rejectRequest', () => {
    it('should reject request and set status to REJECTED', async () => {
      repo.findById.mockResolvedValue({ ...mockRequest, status: RequestStatus.PENDING });
      employeeRepoMock.findOne.mockResolvedValue(mockManager);

      const currentLevel = {
        id: 50,
        levelOrder: 1,
        approverEmployeeId: 200,
        status: ApprovalLevelStatus.PENDING,
      };
      repo.getApprovalLevel.mockResolvedValue(currentLevel);
      repo.getApprovalLevels.mockResolvedValue([currentLevel]);

      await service.rejectRequest(1, { comment: 'Không đủ điều kiện' }, { id: 2 });

      expect(repo.updateApprovalLevel).toHaveBeenCalledWith(50, expect.objectContaining({
        status: ApprovalLevelStatus.REJECTED,
        comment: 'Không đủ điều kiện',
        actionedByEmployeeId: 200,
      }));
      expect(repo.update).toHaveBeenCalledWith(1, expect.objectContaining({
        status: RequestStatus.REJECTED,
      }));
    });

    it('should throw 400 when request is not PENDING', async () => {
      repo.findById.mockResolvedValue({ ...mockRequest, status: RequestStatus.APPROVED });
      employeeRepoMock.findOne.mockResolvedValue(mockManager);

      await expectHttpError(
        service.rejectRequest(1, { comment: '' }, { id: 2 }),
        400,
        'không ở trạng thái chờ duyệt',
      );
    });

    it('should throw 403 when user is not the valid approver', async () => {
      repo.findById.mockResolvedValue({ ...mockRequest, status: RequestStatus.PENDING });
      employeeRepoMock.findOne.mockResolvedValue({ ...mockEmployee, id: 999 });

      const currentLevel = { id: 50, levelOrder: 1, approverEmployeeId: 200 };
      repo.getApprovalLevel.mockResolvedValue(currentLevel);

      await expectHttpError(
        service.rejectRequest(1, { comment: '' }, { id: 1 }),
        403,
        'không phải người duyệt hợp lệ',
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  revokeApproval
  // ═══════════════════════════════════════════════════════════════
  describe('revokeApproval', () => {
    it('should revoke approval and reset levels', async () => {
      repo.findById.mockResolvedValue({ ...mockRequest, status: RequestStatus.PENDING, currentApprovalLevel: 2 });
      employeeRepoMock.findOne.mockResolvedValue(mockManager);

      const level1 = { id: 50, levelOrder: 1, levelName: 'Cấp 1', approverEmployeeId: 200, status: ApprovalLevelStatus.APPROVED };
      const level2 = { id: 51, levelOrder: 2, levelName: 'Cấp 2', approverEmployeeId: 300, status: ApprovalLevelStatus.PENDING };

      repo.getApprovalLevel.mockResolvedValue(level1);
      repo.getApprovalLevels.mockResolvedValue([level1, level2]);

      await service.revokeApproval(1, { levelOrder: 1, comment: 'Sai thông tin' }, { id: 2 });

      // Reset level 1 to PENDING
      expect(repo.updateApprovalLevel).toHaveBeenCalledWith(50, expect.objectContaining({
        status: ApprovalLevelStatus.PENDING,
        actionedAt: null,
      }));

      // Reset level 2 (behind) to PENDING
      expect(repo.updateApprovalLevel).toHaveBeenCalledWith(51, expect.objectContaining({
        status: ApprovalLevelStatus.PENDING,
        actionedAt: null,
      }));

      // Update master request back to level 1
      expect(repo.update).toHaveBeenCalledWith(1, expect.objectContaining({
        status: RequestStatus.PENDING,
        currentApprovalLevel: 1,
      }));
    });

    it('should throw 400 when request is not PENDING', async () => {
      repo.findById.mockResolvedValue({ ...mockRequest, status: RequestStatus.APPROVED });
      employeeRepoMock.findOne.mockResolvedValue(mockManager);

      await expectHttpError(
        service.revokeApproval(1, { levelOrder: 1 }, { id: 2 }),
        400,
        'Chỉ có thể hủy duyệt',
      );
    });

    it('should throw 404 when target level not found', async () => {
      repo.findById.mockResolvedValue({ ...mockRequest, status: RequestStatus.PENDING });
      employeeRepoMock.findOne.mockResolvedValue(mockManager);
      repo.getApprovalLevel.mockResolvedValue(null);

      await expectHttpError(
        service.revokeApproval(1, { levelOrder: 5 }, { id: 2 }),
        404,
        'Không tìm thấy cấp duyệt cần hủy',
      );
    });

    it('should throw 403 when user is not the approver for that level', async () => {
      repo.findById.mockResolvedValue({ ...mockRequest, status: RequestStatus.PENDING });
      employeeRepoMock.findOne.mockResolvedValue({ ...mockEmployee, id: 999 });

      const level = { id: 50, levelOrder: 1, approverEmployeeId: 200, status: ApprovalLevelStatus.APPROVED };
      repo.getApprovalLevel.mockResolvedValue(level);

      await expectHttpError(
        service.revokeApproval(1, { levelOrder: 1 }, { id: 1 }),
        403,
        'hủy duyệt cấp mà bạn đã phê duyệt',
      );
    });

    it('should throw 400 when target level is not APPROVED', async () => {
      repo.findById.mockResolvedValue({ ...mockRequest, status: RequestStatus.PENDING });
      employeeRepoMock.findOne.mockResolvedValue(mockManager);

      const level = { id: 50, levelOrder: 1, approverEmployeeId: 200, status: ApprovalLevelStatus.PENDING };
      repo.getApprovalLevel.mockResolvedValue(level);

      await expectHttpError(
        service.revokeApproval(1, { levelOrder: 1 }, { id: 2 }),
        400,
        'chưa được phê duyệt',
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  getMyRequests
  // ═══════════════════════════════════════════════════════════════
  describe('getMyRequests', () => {
    it('should return my requests with approval levels and attachments', async () => {
      employeeRepoMock.findOne.mockResolvedValue(mockEmployee);
      repo.findMyRequests.mockResolvedValue({
        items: [mockRequest],
        total: 1,
      });
      repo.getApprovalLevels.mockResolvedValue([]);
      repo.getAttachments.mockResolvedValue([]);

      const result = await service.getMyRequests({ page: 1, limit: 20 }, mockReqUser);

      expect(repo.findMyRequests).toHaveBeenCalledWith(expect.objectContaining({
        employeeId: 100,
      }));
      expect(result.total).toBe(1);
      expect(result.items[0].approvalLevels).toEqual([]);
      expect(result.items[0].attachments).toEqual([]);
    });

    it('should throw 404 when employee not found', async () => {
      employeeRepoMock.findOne.mockResolvedValue(null);

      await expectHttpError(
        service.getMyRequests({}, mockReqUser),
        404,
        'Không tìm thấy thông tin nhân viên',
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  getRequestDetail
  // ═══════════════════════════════════════════════════════════════
  describe('getRequestDetail', () => {
    it('should return request detail with approval levels when user has VIEW_ALL', async () => {
      repo.findById.mockResolvedValue(mockRequest);
      employeeRepoMock.findOne.mockResolvedValue(mockEmployee);
      repo.getApprovalLevels.mockResolvedValue([]);
      repo.getAttachments.mockResolvedValue([]);

      const result = await service.getRequestDetail(1, mockReqUser);

      expect(result.approvalLevels).toEqual([]);
      expect(result.attachments).toEqual([]);
    });

    it('should throw 403 when user has no VIEW_ALL and is not owner/approver', async () => {
      repo.findById.mockResolvedValue(mockRequest);
      employeeRepoMock.findOne.mockResolvedValue({ ...mockEmployee, id: 999 });
      repo.getApprovalLevels.mockResolvedValue([
        { approverEmployeeId: 200 },
      ]);

      const userNoPerms = { id: 1, permissions: [] };

      await expectHttpError(
        service.getRequestDetail(1, userNoPerms),
        403,
        'không có quyền xem đơn',
      );
    });

    it('should allow access when user is an approver', async () => {
      repo.findById.mockResolvedValue(mockRequest);
      employeeRepoMock.findOne.mockResolvedValue(mockManager); // id: 200
      repo.getApprovalLevels.mockResolvedValue([
        { approverEmployeeId: 200 },
      ]);
      repo.getAttachments.mockResolvedValue([]);

      const userNoViewAll = { id: 2, permissions: [] };

      const result = await service.getRequestDetail(1, userNoViewAll);

      expect(result.id).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  getPendingApprovals
  // ═══════════════════════════════════════════════════════════════
  describe('getPendingApprovals', () => {
    it('should return pending requests for the approver', async () => {
      employeeRepoMock.findOne.mockResolvedValue(mockManager);
      repo.findPendingForApprover.mockResolvedValue({
        items: [mockRequest],
        total: 1,
      });
      repo.getApprovalLevels.mockResolvedValue([]);

      const result = await service.getPendingApprovals({ page: 1, limit: 20 }, { id: 2 });

      expect(repo.findPendingForApprover).toHaveBeenCalledWith(200, expect.objectContaining({
        limit: 20,
      }));
      expect(result.total).toBe(1);
    });

    it('should throw 404 when employee not found', async () => {
      employeeRepoMock.findOne.mockResolvedValue(null);

      await expectHttpError(
        service.getPendingApprovals({}, { id: 999 }),
        404,
        'Không tìm thấy thông tin nhân viên',
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  estimateQuantity
  // ═══════════════════════════════════════════════════════════════
  describe('estimateQuantity', () => {
    it('should throw 400 when missing required params', async () => {
      await expectHttpError(
        service.estimateQuantity({ employeeId: 1 }),
        400,
        'Thiếu tham số',
      );
    });

    it('should throw 400 when startDate > endDate', async () => {
      await expectHttpError(
        service.estimateQuantity({
          employeeId: 1,
          startDate: '2026-04-10',
          endDate: '2026-04-01',
          unit: 'DAY',
        }),
        400,
        'Ngày bắt đầu phải nhỏ hơn',
      );
    });

    it('should return estimated quantity for DAY unit', async () => {
      const result = await service.estimateQuantity({
        employeeId: 1,
        startDate: '2026-04-01',
        endDate: '2026-04-05',
        unit: 'DAY',
      });

      expect(result.unit).toBe('DAY');
      expect(result.estimatedQuantity).toBe(5); // mocked countWorkingDays returns 5
    });

    it('should return 1 for TIME unit', async () => {
      const result = await service.estimateQuantity({
        employeeId: 1,
        startDate: '2026-04-01',
        endDate: '2026-04-01',
        unit: 'TIME',
      });

      expect(result.estimatedQuantity).toBe(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════
  //  getAllRequests
  // ═══════════════════════════════════════════════════════════════
  describe('getAllRequests', () => {
    it('should return all requests with pagination', async () => {
      repo.findAll.mockResolvedValue({ items: [mockRequest], total: 1 });

      const result = await service.getAllRequests({ page: 1, limit: 20 });

      expect(repo.findAll).toHaveBeenCalled();
      expect(result.total).toBe(1);
      expect(result.items).toHaveLength(1);
    });
  });
});
