import { RequestsRepository } from '../repositories/requests.repository.js';
import { RequestGroupWorkflowsRepository } from '../repositories/request-group-workflows.repository.js';
import { RequestTypesRepository } from '../repositories/request-types.repository.js';
import { NotFoundException, BadRequestException, ForbiddenException } from '../common/exceptions/index.js';
import { RequestStatus, ApprovalLevelStatus, ApproverType } from '../common/enums/request.enum.js';
import { AppDataSource } from '../database/data-source.js';
import { EmployeeEntity } from '../models/entities/employee.entity.js';

export class RequestsService {
    constructor() {
        this.repo = new RequestsRepository();
        this.workflowRepo = new RequestGroupWorkflowsRepository();
        this.typeRepo = new RequestTypesRepository();
    }

    // Lazy getter — chỉ lấy repository khi thực sự gọi method (lúc đó DB đã init xong)
    get employeeRepo() {
        if (!this._employeeRepo) {
            this._employeeRepo = AppDataSource.getRepository(EmployeeEntity);
        }
        return this._employeeRepo;
    }

    // ─── HELPER: Lấy employee từ userId ────────────────────────────────
    async _getEmployeeByUserId(userId) {
        return await this.employeeRepo.findOne({ where: { userId, isDeleted: false } });
    }

    // ─── HELPER: Resolve người duyệt thực tế ───────────────────────────
    async _resolveApprover(wf, targetEmployee) {
        if (wf.approverType === ApproverType.DIRECT_MANAGER) {
            if (!targetEmployee.directManagerId) return null;
            return await this.employeeRepo.findOne({
                where: { id: targetEmployee.directManagerId, isDeleted: false },
            });
        }
        // ROLE: approverUser là user cụ thể đã được chọn khi config workflow
        if (wf.approverUserId) {
            return await this.employeeRepo.findOne({
                where: { userId: wf.approverUserId, isDeleted: false },
            });
        }
        return null;
    }

    // ─── HELPER: Lấy request và kiểm tra tồn tại ───────────────────────
    async _findRequestOrFail(id) {
        const request = await this.repo.findById(id);
        if (!request) throw new NotFoundException('Không tìm thấy đơn từ');
        return request;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // UC-REQ-02: Lưu nháp
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    async saveDraft(body, reqUser) {
        const creatorEmployee = await this._getEmployeeByUserId(reqUser.id);
        if (!creatorEmployee) throw new NotFoundException('Không tìm thấy thông tin nhân viên của bạn');

        const { employeeId, requestTypeId, startDate, endDate, startTime, endTime, description, requestId } = body;

        const targetEmployeeId = employeeId || creatorEmployee.id;

        if (targetEmployeeId !== creatorEmployee.id) {
            if (!reqUser.permissions.includes('REQUEST_CREATE_FOR_OTHERS')) {
                throw new ForbiddenException('Bạn không có quyền tạo đơn cho người khác');
            }
        }

        const requestType = await this.typeRepo.findById(requestTypeId);
        if (!requestType || requestType.status !== 'ACTIVE') {
            throw new BadRequestException('Loại đơn không tồn tại hoặc không còn hoạt động');
        }

        const policy = requestType.policy;
        const data = {
            employeeId: targetEmployeeId,
            createdByEmployeeId: creatorEmployee.id,
            requestTypeId,
            requestGroupId: requestType.requestGroupId,
            status: RequestStatus.DRAFT,
            startDate: startDate || null,
            endDate: endDate || null,
            startTime: startTime || null,
            endTime: endTime || null,
            isWorkedTime: policy?.isWorkedTime ?? false,
            unit: policy?.unit ?? null,
            description: description || null,
            currentApprovalLevel: 0,
            totalApprovalLevels: 0,
        };

        if (requestId) {
            const existing = await this._findRequestOrFail(requestId);
            if (existing.status !== RequestStatus.DRAFT) {
                throw new BadRequestException('Chỉ có thể chỉnh sửa đơn ở trạng thái nháp');
            }
            return await this.repo.update(requestId, data);
        } else {
            const requestCode = await this.repo.generateRequestCode();
            return await this.repo.create({ ...data, requestCode });
        }
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // UC-REQ-03: Gửi duyệt
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    async submitRequest(requestId, body, reqUser) {
        const request = await this._findRequestOrFail(requestId);

        if (request.status !== RequestStatus.DRAFT) {
            throw new BadRequestException('Chỉ có thể gửi duyệt đơn ở trạng thái nháp');
        }
        if (!request.startDate) throw new BadRequestException('Thiếu thông tin ngày bắt đầu');
        if (!request.endDate) throw new BadRequestException('Thiếu thông tin ngày kết thúc');
        if (new Date(request.startDate) > new Date(request.endDate)) {
            throw new BadRequestException('Ngày bắt đầu không được lớn hơn ngày kết thúc');
        }

        const workflows = await this.workflowRepo.findByGroupId(request.requestGroupId);
        if (!workflows || workflows.length === 0) {
            throw new BadRequestException('Nhóm đơn chưa được cấu hình workflow phê duyệt');
        }

        const targetEmployee = await this.employeeRepo.findOne({
            where: { id: request.employeeId, isDeleted: false },
        });

        const approvalLevels = [];
        for (const wf of workflows) {
            const approverEmployee = await this._resolveApprover(wf, targetEmployee);
            if (!approverEmployee) {
                throw new BadRequestException(
                    `Không xác định được người duyệt cho cấp "${wf.levelName}". Vui lòng kiểm tra lại cấu hình.`
                );
            }
            approvalLevels.push({
                requestId: request.id,
                levelOrder: wf.levelOrder,
                levelName: wf.levelName,
                approverType: wf.approverType,
                approverRoleId: wf.approverRoleId,
                approverEmployeeId: approverEmployee.id,
                status: ApprovalLevelStatus.PENDING,
                notifyApprover: wf.notifyApprover,
            });
        }

        await this.repo.createApprovalLevels(approvalLevels);

        return await this.repo.update(request.id, {
            status: RequestStatus.PENDING,
            currentApprovalLevel: 1,
            totalApprovalLevels: workflows.length,
            submittedAt: new Date(),
        });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // UC-REQ-04: Hủy đơn (chỉ khi chưa có cấp nào APPROVED)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    async cancelRequest(requestId, reqUser) {
        const request = await this._findRequestOrFail(requestId);
        const employee = await this._getEmployeeByUserId(reqUser.id);

        if (request.createdByEmployeeId !== employee?.id && request.employeeId !== employee?.id) {
            throw new ForbiddenException('Bạn không có quyền hủy đơn này');
        }

        if (![RequestStatus.DRAFT, RequestStatus.PENDING].includes(request.status)) {
            throw new BadRequestException('Không thể hủy đơn ở trạng thái hiện tại');
        }

        if (request.status === RequestStatus.PENDING) {
            const levels = await this.repo.getApprovalLevels(requestId);
            const anyApproved = levels.some((l) => l.status === ApprovalLevelStatus.APPROVED);
            if (anyApproved) {
                throw new BadRequestException(
                    'Không thể hủy đơn khi đã có cấp duyệt phê duyệt. Vui lòng yêu cầu người duyệt hủy duyệt trước.'
                );
            }
        }

        await this.repo.update(requestId, {
            status: RequestStatus.CANCELLED,
            cancelledAt: new Date(),
            cancelledByEmployeeId: employee?.id,
        });

        return { message: 'Hủy đơn thành công' };
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // UC-REQ-09: Phê duyệt đơn
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    async approveRequest(requestId, reqUser) {
        const request = await this._findRequestOrFail(requestId);
        const approver = await this._getEmployeeByUserId(reqUser.id);

        if (request.status !== RequestStatus.PENDING) {
            throw new BadRequestException('Đơn không ở trạng thái chờ duyệt');
        }

        const currentLevel = await this.repo.getApprovalLevel(requestId, request.currentApprovalLevel);
        if (!currentLevel) throw new BadRequestException('Không tìm thấy thông tin cấp duyệt hiện tại');

        if (currentLevel.approverEmployeeId !== approver?.id) {
            throw new ForbiddenException('Bạn không phải người duyệt hợp lệ cho cấp duyệt này');
        }

        await this.repo.updateApprovalLevel(currentLevel.id, {
            status: ApprovalLevelStatus.APPROVED,
            actionedAt: new Date(),
            actionedByEmployeeId: approver.id,
        });

        const isLastLevel = request.currentApprovalLevel >= request.totalApprovalLevels;
        if (isLastLevel) {
            await this.repo.update(requestId, {
                status: RequestStatus.APPROVED,
                approvedAt: new Date(),
            });
        } else {
            await this.repo.update(requestId, {
                currentApprovalLevel: request.currentApprovalLevel + 1,
            });
        }

        return await this._findRequestOrFail(requestId);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // UC-REQ-10: Từ chối đơn
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    async rejectRequest(requestId, { comment }, reqUser) {
        const request = await this._findRequestOrFail(requestId);
        const approver = await this._getEmployeeByUserId(reqUser.id);

        if (request.status !== RequestStatus.PENDING) {
            throw new BadRequestException('Đơn không ở trạng thái chờ duyệt');
        }

        const currentLevel = await this.repo.getApprovalLevel(requestId, request.currentApprovalLevel);
        if (!currentLevel) throw new BadRequestException('Không tìm thấy thông tin cấp duyệt hiện tại');

        if (currentLevel.approverEmployeeId !== approver?.id) {
            throw new ForbiddenException('Bạn không phải người duyệt hợp lệ cho cấp duyệt này');
        }

        await this.repo.updateApprovalLevel(currentLevel.id, {
            status: ApprovalLevelStatus.REJECTED,
            actionedAt: new Date(),
            actionedByEmployeeId: approver.id,
            comment: comment || null,
        });

        await this.repo.update(requestId, {
            status: RequestStatus.REJECTED,
            rejectedAt: new Date(),
        });

        return await this._findRequestOrFail(requestId);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Hủy duyệt (Revoke) — thu hồi quyết định approve
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    async revokeApproval(requestId, { levelOrder, comment }, reqUser) {
        const request = await this._findRequestOrFail(requestId);
        const approver = await this._getEmployeeByUserId(reqUser.id);

        if (![RequestStatus.PENDING, RequestStatus.APPROVED].includes(request.status)) {
            throw new BadRequestException('Chỉ có thể hủy duyệt khi đơn đang chờ duyệt hoặc đã duyệt');
        }

        const targetLevel = await this.repo.getApprovalLevel(requestId, levelOrder);
        if (!targetLevel) throw new NotFoundException('Không tìm thấy cấp duyệt cần hủy');

        if (targetLevel.approverEmployeeId !== approver?.id) {
            throw new ForbiddenException('Bạn chỉ có thể hủy duyệt cấp mà bạn đã phê duyệt');
        }

        if (targetLevel.status !== ApprovalLevelStatus.APPROVED) {
            throw new BadRequestException('Cấp duyệt này chưa được phê duyệt, không thể hủy duyệt');
        }

        // Đánh REVOKED cấp đó
        await this.repo.updateApprovalLevel(targetLevel.id, {
            status: ApprovalLevelStatus.REVOKED,
            actionedAt: new Date(),
            actionedByEmployeeId: approver.id,
            comment: comment || null,
        });

        // Reset các cấp sau về PENDING (nếu đã xử lý)
        const allLevels = await this.repo.getApprovalLevels(requestId);
        for (const lvl of allLevels) {
            if (lvl.levelOrder > levelOrder && lvl.status === ApprovalLevelStatus.APPROVED) {
                await this.repo.updateApprovalLevel(lvl.id, {
                    status: ApprovalLevelStatus.PENDING,
                    actionedAt: null,
                    actionedByEmployeeId: null,
                    comment: null,
                });
            }
        }

        // Đơn quay lại PENDING tại cấp đó để xử lý tiếp (có thể reject)
        await this.repo.update(requestId, {
            status: RequestStatus.PENDING,
            currentApprovalLevel: levelOrder,
            approvedAt: null,
        });

        return await this._findRequestOrFail(requestId);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // UC-REQ-05: Danh sách đơn của tôi
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    async getMyRequests(query, reqUser) {
        const employee = await this._getEmployeeByUserId(reqUser.id);
        if (!employee) throw new NotFoundException('Không tìm thấy thông tin nhân viên');

        const { status, requestTypeId, startDate, endDate, page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;

        const { items, total } = await this.repo.findMyRequests({
            employeeId: employee.id,
            status,
            requestTypeId: requestTypeId ? parseInt(requestTypeId) : undefined,
            startDate,
            endDate,
            skip,
            limit: parseInt(limit),
        });

        const itemsWithLevels = await Promise.all(
            items.map(async (req) => ({
                ...req,
                approvalLevels: await this.repo.getApprovalLevels(req.id),
                attachments: await this.repo.getAttachments(req.id),
            }))
        );

        return { items: itemsWithLevels, total, page: parseInt(page), limit: parseInt(limit) };
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // UC-REQ-06: Chi tiết đơn
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    async getRequestDetail(requestId, reqUser) {
        const request = await this._findRequestOrFail(requestId);
        const employee = await this._getEmployeeByUserId(reqUser.id);
        const hasViewAll = reqUser.permissions.includes('REQUEST_VIEW_ALL');

        if (!hasViewAll) {
            const isOwner = request.employeeId === employee?.id || request.createdByEmployeeId === employee?.id;
            const approvalLevels = await this.repo.getApprovalLevels(requestId);
            const isApprover = approvalLevels.some((l) => l.approverEmployeeId === employee?.id);
            if (!isOwner && !isApprover) {
                throw new ForbiddenException('Bạn không có quyền xem đơn này');
            }
        }

        const approvalLevels = await this.repo.getApprovalLevels(requestId);
        const attachments = await this.repo.getAttachments(requestId);

        return { ...request, approvalLevels, attachments };
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // UC-REQ-08: Danh sách đơn chờ duyệt
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    async getPendingApprovals(query, reqUser) {
        const employee = await this._getEmployeeByUserId(reqUser.id);
        if (!employee) throw new NotFoundException('Không tìm thấy thông tin nhân viên');

        const { page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;

        const { items, total } = await this.repo.findPendingForApprover(employee.id, {
            skip,
            limit: parseInt(limit),
        });

        const itemsWithLevels = await Promise.all(
            items.map(async (req) => ({
                ...req,
                approvalLevels: await this.repo.getApprovalLevels(req.id),
            }))
        );

        return { items: itemsWithLevels, total, page: parseInt(page), limit: parseInt(limit) };
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Xem tất cả đơn (HR/Admin)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    async getAllRequests(query) {
        const { status, requestTypeId, employeeId, startDate, endDate, page = 1, limit = 20 } = query;
        const skip = (page - 1) * limit;
        const { items, total } = await this.repo.findAll({
            status,
            requestTypeId: requestTypeId ? parseInt(requestTypeId) : undefined,
            employeeId: employeeId ? parseInt(employeeId) : undefined,
            startDate,
            endDate,
            skip,
            limit: parseInt(limit),
        });
        return { items, total, page: parseInt(page), limit: parseInt(limit) };
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Lưu đính kèm file
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    async saveAttachments(requestId, files, reqUser) {
        const request = await this._findRequestOrFail(requestId);
        const employee = await this._getEmployeeByUserId(reqUser.id);

        const attachments = files.map((file) => ({
            requestId: request.id,
            fileName: file.originalname,
            filePath: file.path.replace(/\\/g, '/'),
            fileSize: file.size,
            mimeType: file.mimetype,
            uploadedByEmployeeId: employee?.id,
        }));

        return await this.repo.createAttachments(attachments);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Preview workflow trước khi submit (hiển thị trên form tạo đơn)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    async getWorkflowPreview(requestTypeId, employeeId) {
        const requestType = await this.typeRepo.findById(requestTypeId);
        if (!requestType) throw new NotFoundException('Không tìm thấy loại đơn');

        const workflows = await this.workflowRepo.findByGroupId(requestType.requestGroupId);
        const targetEmployee = await this.employeeRepo.findOne({
            where: { id: employeeId, isDeleted: false },
            relations: ['directManager'],
        });

        return await Promise.all(
            workflows.map(async (wf) => {
                const approver = await this._resolveApprover(wf, targetEmployee);
                return {
                    levelOrder: wf.levelOrder,
                    levelName: wf.levelName,
                    approverType: wf.approverType,
                    approverEmployee: approver ? { id: approver.id, fullName: approver.fullName } : null,
                    resolved: !!approver,
                };
            })
        );
    }
}
