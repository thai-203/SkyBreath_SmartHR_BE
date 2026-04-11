import { RequestsRepository } from '../repositories/requests.repository.js';
import { RequestGroupWorkflowsRepository } from '../repositories/request-group-workflows.repository.js';
import { RequestTypesRepository } from '../repositories/request-types.repository.js';
import { RequestGroupsRepository } from '../repositories/request-groups.repository.js';
import { NotFoundException, BadRequestException, ForbiddenException } from '../common/exceptions/index.js';
import { RequestStatus, ApprovalLevelStatus, ApproverType, RequestGroupCode } from '../common/enums/request.enum.js';
import { AppDataSource } from '../database/data-source.js';
import { EmployeeEntity } from '../models/entities/employee.entity.js';
import { NotificationsService } from './notifications.service.js';
import { countWorkingDays, getWorkingHoursForDay } from '../common/helpers/working-days.helper.js';

export class RequestsService {
    constructor() {
        this.repo = new RequestsRepository();
        this.workflowRepo = new RequestGroupWorkflowsRepository();
        this.typeRepo = new RequestTypesRepository();
        this.requestGroupsRepo = new RequestGroupsRepository();
        this.notificationService = new NotificationsService();
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

    // ─── HELPER: Lấy employee name từ employeeId ────────────────────────
    async _getEmployeeName(employeeId) {
        const emp = await this.employeeRepo.findOne({ where: { id: employeeId, isDeleted: false } });
        return emp?.fullName || 'Nhân viên';
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // UC-REQ-02: Lưu nháp
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    async saveDraft(body, reqUser) {
        const creatorEmployee = await this._getEmployeeByUserId(reqUser.id);
        if (!creatorEmployee) throw new NotFoundException('Không tìm thấy thông tin nhân viên của bạn');

        const { employeeId, requestTypeId, startDate, endDate, startTime, endTime, description, requestId, overtimeTypeId } = body;

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
            overtimeTypeId: overtimeTypeId || null,
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

        if (startDate && endDate) {
            const startD = new Date(startDate);
            const endD = new Date(endDate);
            if (startD > endD) throw new BadRequestException('Ngày bắt đầu không được lớn hơn ngày kết thúc');
            
            const overlaps = await this.repo.findOverlappingRequests({
                employeeId: targetEmployeeId,
                requestGroupId: requestType.requestGroupId,
                startDate: startD,
                endDate: endD,
                excludeRequestId: requestId || null
            });
            if (overlaps.length > 0) {
                throw new BadRequestException('Thời gian lưu đơn bị trùng lặp với một đơn khác đang có hiệu lực trong hệ thống.');
            }
        }

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
    // QUOTA: Tính hạn mức đã dùng
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    /**
     * Lấy thông tin hạn mức sử dụng cho một loại đơn của nhân viên
     * @param {number} requestTypeId
     * @param {number} employeeId
     * @param {number|null} excludeRequestId - loại trừ đơn đang edit
     */
    async getQuotaStatus(requestTypeId, employeeId, excludeRequestId = null) {
        const requestType = await this.typeRepo.findById(requestTypeId);
        if (!requestType) throw new NotFoundException('Không tìm thấy loại đơn');

        const policy = requestType.policy;
        // Nếu không có policy hoặc không giới hạn → trả về không giới hạn
        if (!policy || !policy.maxQuantity || parseFloat(policy.maxQuantity) === 0 || policy.isUnlimited) {
            return { hasQuota: false, maxQuantity: null, usedQuantity: 0, remainingQuantity: null, unit: policy?.unit || 'DAY', trackingCycle: policy?.trackingCycle || 'YEAR' };
        }

        const { maxQuantity, trackingCycle, unit } = policy;
        const now = new Date();

        // Xác định khoảng thời gian theo chu kỳ
        let periodStart, periodEnd;
        if (trackingCycle === 'YEAR') {
            periodStart = new Date(now.getFullYear(), 0, 1);
            periodEnd = new Date(now.getFullYear(), 11, 31);
        } else if (trackingCycle === 'MONTH') {
            periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
            periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        } else if (trackingCycle === 'WEEK') {
            const dayOfWeek = now.getDay() || 7; // Mon=1..Sun=7
            periodStart = new Date(now);
            periodStart.setDate(now.getDate() - dayOfWeek + 1);
            periodEnd = new Date(periodStart);
            periodEnd.setDate(periodStart.getDate() + 6);
        } else {
            // DAY: chỉ tính hôm nay
            periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            periodEnd = new Date(periodStart);
        }

        // Lấy các đơn đã dùng trong chu kỳ
        const usedRequests = await this.repo.findUsedRequests({
            employeeId,
            requestTypeId,
            periodStart,
            periodEnd,
            excludeRequestId: excludeRequestId ? parseInt(excludeRequestId) : null,
        });

        // Tính tổng số lượng đã dùng dựa trên unit
        let usedQuantity = 0;
        for (const req of usedRequests) {
            const reqStart = new Date(req.startDate);
            const reqEnd = new Date(req.endDate);
            // Clip vào trong chu kỳ
            const clipStart = reqStart < periodStart ? periodStart : reqStart;
            const clipEnd = reqEnd > periodEnd ? periodEnd : reqEnd;

            if (unit === 'DAY') {
                // Tính số ngày làm việc
                const days = await countWorkingDays(clipStart, clipEnd, employeeId, AppDataSource);
                usedQuantity += days;
            } else if (unit === 'HOUR') {
                if (req.startTime && req.endTime) {
                    const startD = new Date(req.startDate);
                    const endD = new Date(req.endDate);
                    const [startH, startM] = req.startTime.split(':').map(Number);
                    const [endH, endM] = req.endTime.split(':').map(Number);
                    startD.setHours(startH, startM, 0, 0);
                    endD.setHours(endH, endM, 0, 0);
                    const diff = (endD - startD) / (1000 * 60 * 60);
                    if (diff > 0) {
                        usedQuantity += diff;
                    }
                } else {
                    // Tính số giờ dựa trên ca làm việc
                    const cursor = new Date(clipStart);
                    cursor.setHours(0, 0, 0, 0);
                    while (cursor <= clipEnd) {
                        const hoursInDay = await getWorkingHoursForDay(cursor, employeeId, AppDataSource);
                        usedQuantity += hoursInDay;
                        cursor.setDate(cursor.getDate() + 1);
                    }
                }
            } else if (unit === 'HALF_DAY') {
                // Tính số nửa ngày (1 ngày = 2 nửa ngày)
                const days = await countWorkingDays(clipStart, clipEnd, employeeId, AppDataSource);
                usedQuantity += days * 2;
            } else {
                // TIME/OTHER: tính số lần (1 đơn = 1 lần)
                usedQuantity += 1;
            }
        }

        const remainingQuantity = Math.max(0, parseFloat(maxQuantity) - usedQuantity);
        return {
            hasQuota: true,
            maxQuantity: parseFloat(maxQuantity),
            usedQuantity: Math.round(usedQuantity * 100) / 100,
            remainingQuantity: Math.round(remainingQuantity * 100) / 100,
            unit,
            trackingCycle,
            periodStart: periodStart.toISOString().slice(0, 10),
            periodEnd: periodEnd.toISOString().slice(0, 10),
        };
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Ước tính số lượng ngày/giờ dựa trên ca làm việc (dành cho màn hình Tạo/Sửa UI)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    async estimateQuantity(query) {
        const { employeeId, startDate, endDate, startTime, endTime, unit } = query;
        if (!employeeId || !startDate || !endDate || !unit) {
            throw new BadRequestException('Thiếu tham số (employeeId, startDate, endDate, unit)');
        }

        const reqStart = new Date(startDate);
        const reqEnd = new Date(endDate);
        if (reqStart > reqEnd) {
            throw new BadRequestException('Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc');
        }

        let requestedQty = 0;

        if (unit === 'DAY') {
            requestedQty = await countWorkingDays(reqStart, reqEnd, employeeId, AppDataSource);
        } else if (unit === 'HOUR') {
            if (startTime && endTime) {
                const startD = new Date(startDate);
                const endD = new Date(endDate);
                const [startH, startM] = startTime.split(':').map(Number);
                const [endH, endM] = endTime.split(':').map(Number);
                startD.setHours(startH, startM, 0, 0);
                endD.setHours(endH, endM, 0, 0);
                const diff = (endD - startD) / (1000 * 60 * 60);
                if (diff > 0) {
                    requestedQty = diff;
                }
            } else {
                const cursor = new Date(reqStart);
                cursor.setHours(0, 0, 0, 0);
                while (cursor <= reqEnd) {
                    requestedQty += await getWorkingHoursForDay(cursor, employeeId, AppDataSource);
                    cursor.setDate(cursor.getDate() + 1);
                }
            }
        } else if (unit === 'HALF_DAY') {
            requestedQty = await countWorkingDays(reqStart, reqEnd, employeeId, AppDataSource) * 2;
        } else {
            requestedQty = 1; // TIME unit
        }

        return {
            unit,
            estimatedQuantity: Math.round(requestedQty * 100) / 100
        };
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

        // ✅ Kiểm tra Overlap trước khi submit
        const overlaps = await this.repo.findOverlappingRequests({
            employeeId: request.employeeId,
            requestGroupId: request.requestGroupId,
            startDate: new Date(request.startDate),
            endDate: new Date(request.endDate),
            excludeRequestId: request.id
        });
        if (overlaps.length > 0) {
            throw new BadRequestException('Thời gian gửi duyệt của đơn bị trùng lặp với một đơn khác đang có hiệu lực.');
        }

        // ✅ Kiểm tra hạn mức policy (server-side validation)
        try {
            const quota = await this.getQuotaStatus(request.requestTypeId, request.employeeId, request.id);
            if (quota.hasQuota) {
                const reqStart = new Date(request.startDate);
                const reqEnd = new Date(request.endDate);
                let requestedQty = 0;

                if (quota.unit === 'DAY') {
                    requestedQty = await countWorkingDays(reqStart, reqEnd, request.employeeId, AppDataSource);
                } else if (quota.unit === 'HOUR') {
                    if (request.startTime && request.endTime) {
                        const startD = new Date(request.startDate);
                        const endD = new Date(request.endDate);
                        const [startH, startM] = request.startTime.split(':').map(Number);
                        const [endH, endM] = request.endTime.split(':').map(Number);
                        startD.setHours(startH, startM, 0, 0);
                        endD.setHours(endH, endM, 0, 0);
                        const diff = (endD - startD) / (1000 * 60 * 60);
                        if (diff > 0) {
                            requestedQty = diff;
                        }
                    } else {
                        const cursor = new Date(reqStart);
                        cursor.setHours(0, 0, 0, 0);
                        while (cursor <= reqEnd) {
                            requestedQty += await getWorkingHoursForDay(cursor, request.employeeId, AppDataSource);
                            cursor.setDate(cursor.getDate() + 1);
                        }
                    }
                } else if (quota.unit === 'HALF_DAY') {
                    requestedQty = await countWorkingDays(reqStart, reqEnd, request.employeeId, AppDataSource) * 2;
                } else {
                    requestedQty = 1;
                }

                if (requestedQty > quota.remainingQuantity) {
                    const unitLabel = { DAY: 'ngày', HOUR: 'giờ', HALF_DAY: 'nửa ngày', TIME: 'lần' }[quota.unit] || quota.unit;
                    throw new BadRequestException(
                        `Vượt hạn mức cho phép! Bạn chỉ còn ${quota.remainingQuantity} ${unitLabel} trong ${quota.trackingCycle === 'YEAR' ? 'năm' : quota.trackingCycle === 'MONTH' ? 'tháng' : 'tuần'} này (tối đa ${quota.maxQuantity} ${unitLabel}).`
                    );
                }
            }
        } catch (err) {
            if (err.statusCode === 400) throw err;
            console.error('[Quota] Lỗi kiểm tra hạn mức:', err);
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

        const result = await this.repo.update(request.id, {
            status: RequestStatus.PENDING,
            currentApprovalLevel: 1,
            totalApprovalLevels: workflows.length,
            submittedAt: new Date(),
        });

        // 🔔 Thông báo cho Approver cấp 1
        try {
            const firstLevel = approvalLevels.find(l => l.levelOrder === 1);
            if (firstLevel) {
                const approverEmp = await this.employeeRepo.findOne({ where: { id: firstLevel.approverEmployeeId, isDeleted: false } });
                const creatorName = targetEmployee?.fullName || 'Nhân viên';
                const requestType = await this.typeRepo.findById(request.requestTypeId);

                if (approverEmp?.userId) {
                    await this.notificationService.createAndNotify({
                        title: 'Đơn mới cần phê duyệt',
                        message: `"${creatorName}" đã gửi đơn "${requestType?.name || ''}" cần bạn phê duyệt.`,
                        notificationType: 'WORKFLOW',
                        link: '/requests/pending-approvals',
                        relatedRequestId: request.id,
                        recipientUserIds: [approverEmp.userId],
                    });
                }
            }
        } catch (err) {
            console.error('[Notification] Lỗi gửi thông báo khi submit:', err);
        }

        return result;
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

            // 🔔 Gửi signal REMOVE cho approver cấp hiện tại
            try {
                const currentLevel = levels.find(l => l.levelOrder === request.currentApprovalLevel);
                if (currentLevel) {
                    const approverEmp = await this.employeeRepo.findOne({ where: { id: currentLevel.approverEmployeeId, isDeleted: false } });
                    if (approverEmp?.userId) {
                        const creatorName = await this._getEmployeeName(request.employeeId);
                        this.notificationService.emitRemovePendingRequest([approverEmp.userId], requestId);
                        await this.notificationService.createAndNotify({
                            title: 'Đơn đã bị hủy',
                            message: `Nhân viên "${creatorName}" đã hủy đơn "${request.requestCode}".`,
                            notificationType: 'WORKFLOW',
                            link: '/requests/pending-approvals',
                            relatedRequestId: requestId,
                            recipientUserIds: [approverEmp.userId],
                        });
                    }
                }
            } catch (err) {
                console.error('[Notification] Lỗi gửi thông báo khi cancel:', err);
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

            // 🔔 Đơn đã duyệt hoàn tất — thông báo cho người tạo đơn
            try {
                const creatorEmp = await this.employeeRepo.findOne({ where: { id: request.createdByEmployeeId, isDeleted: false } });
                const approverName = approver?.fullName || 'Người duyệt';
                if (creatorEmp?.userId) {
                    await this.notificationService.createAndNotify({
                        title: 'Đơn đã được duyệt',
                        message: `Đơn "${request.requestCode}" đã được duyệt hoàn tất! "${approverName}" đã phê duyệt cấp cuối cùng.`,
                        notificationType: 'WORKFLOW',
                        link: '/requests/my-requests',
                        relatedRequestId: requestId,
                        recipientUserIds: [creatorEmp.userId],
                    });
                }
            } catch (err) {
                console.error('[Notification] Lỗi gửi thông báo approve (cấp cuối):', err);
            }
        } else {
            await this.repo.update(requestId, {
                currentApprovalLevel: request.currentApprovalLevel + 1,
            });

            // 🔔 Thông báo cho Approver cấp tiếp theo + Người tạo đơn
            try {
                const allLevels = await this.repo.getApprovalLevels(requestId);
                const nextLevel = allLevels.find(l => l.levelOrder === request.currentApprovalLevel + 1);
                const approverName = approver?.fullName || 'Người duyệt';

                // → Thông báo cho cấp tiếp theo
                if (nextLevel) {
                    const nextApproverEmp = await this.employeeRepo.findOne({ where: { id: nextLevel.approverEmployeeId, isDeleted: false } });
                    const nextApproverName = nextApproverEmp?.fullName || 'người duyệt tiếp theo';
                    if (nextApproverEmp?.userId) {
                        await this.notificationService.createAndNotify({
                            title: 'Đơn mới cần phê duyệt',
                            message: `"${approverName}" đã duyệt đơn "${request.requestCode}". Đơn chuyển sang cấp "${nextLevel.levelName}" cho bạn duyệt.`,
                            notificationType: 'WORKFLOW',
                            link: '/requests/pending-approvals',
                            relatedRequestId: requestId,
                            recipientUserIds: [nextApproverEmp.userId],
                        });
                    }

                    // → Thông báo cho người tạo đơn
                    const creatorEmp = await this.employeeRepo.findOne({ where: { id: request.createdByEmployeeId, isDeleted: false } });
                    if (creatorEmp?.userId) {
                        await this.notificationService.createAndNotify({
                            title: 'Đơn đang được xử lý',
                            message: `"${approverName}" đã phê duyệt cấp ${request.currentApprovalLevel} cho đơn "${request.requestCode}". Đơn chuyển sang cho "${nextApproverName}" duyệt.`,
                            notificationType: 'WORKFLOW',
                            link: '/requests/my-requests',
                            relatedRequestId: requestId,
                            recipientUserIds: [creatorEmp.userId],
                        });
                    }
                }
            } catch (err) {
                console.error('[Notification] Lỗi gửi thông báo approve (cấp giữa):', err);
            }
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

        // 🔔 Thông báo cho người tạo đơn + các cấp đã approved trước đó
        try {
            const approverName = approver?.fullName || 'Người duyệt';
            const recipientUserIds = [];

            // Người tạo đơn
            const creatorEmp = await this.employeeRepo.findOne({ where: { id: request.createdByEmployeeId, isDeleted: false } });
            if (creatorEmp?.userId) recipientUserIds.push(creatorEmp.userId);

            // Các cấp đã approved trước đó
            const allLevels = await this.repo.getApprovalLevels(requestId);
            for (const lvl of allLevels) {
                if (lvl.status === ApprovalLevelStatus.APPROVED && lvl.approverEmployeeId) {
                    const emp = await this.employeeRepo.findOne({ where: { id: lvl.approverEmployeeId, isDeleted: false } });
                    if (emp?.userId && !recipientUserIds.includes(emp.userId)) {
                        recipientUserIds.push(emp.userId);
                    }
                }
            }

            if (recipientUserIds.length > 0) {
                await this.notificationService.createAndNotify({
                    title: 'Đơn bị từ chối',
                    message: `"${approverName}" đã từ chối đơn "${request.requestCode}".${comment ? ` Lý do: "${comment}"` : ''}`,
                    notificationType: 'WORKFLOW',
                    link: '/requests/my-requests',
                    relatedRequestId: requestId,
                    recipientUserIds,
                });
            }
        } catch (err) {
            console.error('[Notification] Lỗi gửi thông báo khi reject:', err);
        }

        return await this._findRequestOrFail(requestId);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Hủy duyệt (Revoke) — thu hồi quyết định approve
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    async revokeApproval(requestId, { levelOrder, comment }, reqUser) {
        const request = await this._findRequestOrFail(requestId);
        const approver = await this._getEmployeeByUserId(reqUser.id);

        if (request.status !== RequestStatus.PENDING) {
            throw new BadRequestException('Chỉ có thể hủy duyệt khi đơn đang trong trạng thái chờ duyệt (PENDING)');
        }

        const targetLevel = await this.repo.getApprovalLevel(requestId, levelOrder);
        if (!targetLevel) throw new NotFoundException('Không tìm thấy cấp duyệt cần hủy');

        if (targetLevel.approverEmployeeId !== approver?.id) {
            throw new ForbiddenException('Bạn chỉ có thể hủy duyệt cấp mà bạn đã phê duyệt');
        }

        if (targetLevel.status !== ApprovalLevelStatus.APPROVED) {
            throw new BadRequestException('Cấp duyệt này chưa được phê duyệt, không thể hủy duyệt');
        }

        // Bước 3: Reset cấp hiện tại về PENDING
        await this.repo.updateApprovalLevel(targetLevel.id, {
            status: ApprovalLevelStatus.PENDING,
            actionedAt: null,
            actionedByEmployeeId: null,
            comment: null,
        });

        // Reset các cấp duyệt phía sau (nếu có) về PENDING
        const allLevels = await this.repo.getApprovalLevels(requestId);
        for (const lvl of allLevels) {
            if (lvl.levelOrder > levelOrder) {
                await this.repo.updateApprovalLevel(lvl.id, {
                    status: ApprovalLevelStatus.PENDING,
                    actionedAt: null,
                    actionedByEmployeeId: null,
                    comment: null,
                });
            }
        }

        // Bước 4: Update Master quay về đúng cấp của người dùng
        await this.repo.update(requestId, {
            status: RequestStatus.PENDING,
            currentApprovalLevel: levelOrder,
            approvedAt: null,
        });

        // 🔔 Thông báo
        try {
            const approverName = approver?.fullName || 'Người duyệt';

            // → Gửi REMOVE_PENDING_REQUEST tới approver cấp sau (nếu có)
            const nextLevel = allLevels.find(l => l.levelOrder === levelOrder + 1);
            if (nextLevel) {
                const nextApproverEmp = await this.employeeRepo.findOne({ where: { id: nextLevel.approverEmployeeId, isDeleted: false } });
                if (nextApproverEmp?.userId) {
                    this.notificationService.emitRemovePendingRequest([nextApproverEmp.userId], requestId);
                    await this.notificationService.createAndNotify({
                        title: 'Đơn đã bị thu hồi',
                        message: `"${approverName}" đã hủy phê duyệt đơn "${request.requestCode}". Đơn đã quay lại cấp trước.`,
                        notificationType: 'WORKFLOW',
                        link: '/requests/pending-approvals',
                        relatedRequestId: requestId,
                        recipientUserIds: [nextApproverEmp.userId],
                    });
                }
            }

            // → Thông báo cho người tạo đơn
            const creatorEmp = await this.employeeRepo.findOne({ where: { id: request.createdByEmployeeId, isDeleted: false } });
            if (creatorEmp?.userId) {
                await this.notificationService.createAndNotify({
                    title: 'Đơn bị hủy phê duyệt',
                    message: `"${approverName}" đã hủy phê duyệt đơn "${request.requestCode}". Đơn quay lại cấp "${targetLevel.levelName}" để xử lý lại.`,
                    notificationType: 'WORKFLOW',
                    link: '/requests/my-requests',
                    relatedRequestId: requestId,
                    recipientUserIds: [creatorEmp.userId],
                });
            }
        } catch (err) {
            console.error('[Notification] Lỗi gửi thông báo khi revoke:', err);
        }

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
    // Timesheets/Excuses page: đơn nhóm LATE_EARLY / ATTENDANCE_CORRECTION
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    async getExcuseRequests(query, reqUser) {
        const {
            month,
            year,
            departmentId,
            search,
            status,
            page = 1,
            limit = 20,
        } = query;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Nếu không có quyền view all -> chỉ xem của chính mình
        let employeeId;
        const hasViewAll = reqUser?.permissions?.includes('REQUEST_VIEW_ALL');
        if (!hasViewAll) {
            const employee = await this._getEmployeeByUserId(reqUser.id);
            employeeId = employee?.id;
        }

        // Mặc định chỉ đơn đã duyệt (trang đơn giải trình)
        const statusFilter = status ? String(status) : 'APPROVED';

        return await this.repo.findExcuseRequests({
            month: month ? parseInt(month) : undefined,
            year: year ? parseInt(year) : undefined,
            departmentId: departmentId ? parseInt(departmentId) : undefined,
            search: search ? String(search) : undefined,
            status: statusFilter,
            employeeId,
            skip,
            limit: parseInt(limit),
        });
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Timesheets: Bảng tăng ca chi tiết — nhóm OVERTIME (theo code request_groups)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    async getOvertimeDetailRequests(query, reqUser) {
        const {
            month,
            year,
            departmentId,
            search,
            status,
            page = 1,
            limit = 20,
        } = query;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        let employeeId;
        const hasViewAll = reqUser?.permissions?.includes('REQUEST_VIEW_ALL');
        if (!hasViewAll) {
            const employee = await this._getEmployeeByUserId(reqUser.id);
            employeeId = employee?.id;
        }

        const otGroup = await this.requestGroupsRepo.findByCode(RequestGroupCode.OVERTIME);
        const requestGroupId = otGroup?.id ?? 1;

        // Mặc định chỉ đơn đã duyệt (bảng tăng ca chi tiết)
        const statusFilter = status ? String(status) : 'APPROVED';

        return await this.repo.findOvertimeDetailLinesForGroup({
            requestGroupId,
            month: month ? parseInt(month) : undefined,
            year: year ? parseInt(year) : undefined,
            departmentId: departmentId ? parseInt(departmentId) : undefined,
            search: search ? String(search) : undefined,
            status: statusFilter,
            employeeId,
            skip,
            limit: parseInt(limit),
        });
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
