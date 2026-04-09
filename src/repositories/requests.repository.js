import { Brackets, In } from 'typeorm';
import { AppDataSource } from '../database/data-source.js';
import { RequestEntity } from '../models/entities/request.entity.js';
import { RequestApprovalLevelEntity } from '../models/entities/request-approval-level.entity.js';
import { RequestAttachmentEntity } from '../models/entities/request-attachment.entity.js';
import { OvertimeRequestDetailEntity } from '../models/entities/overtime-request-detail.entity.js';
import { RequestGroupCode } from '../common/enums/request.enum.js';

export class RequestsRepository {
    constructor() {
        // Lazy-init — không gọi getRepository trong constructor
        // vì module này được import trước khi AppDataSource.initialize()
    }

    get repository() {
        if (!this._repository) this._repository = AppDataSource.getRepository(RequestEntity);
        return this._repository;
    }

    get approvalRepo() {
        if (!this._approvalRepo) this._approvalRepo = AppDataSource.getRepository(RequestApprovalLevelEntity);
        return this._approvalRepo;
    }

    get attachmentRepo() {
        if (!this._attachmentRepo) this._attachmentRepo = AppDataSource.getRepository(RequestAttachmentEntity);
        return this._attachmentRepo;
    }

    get otdRepository() {
        if (!this._otdRepo) this._otdRepo = AppDataSource.getRepository(OvertimeRequestDetailEntity);
        return this._otdRepo;
    }

    // ─── REQUEST CRUD ───────────────────────────────────────────────────
    async findById(id) {
        return await this.repository.findOne({
            where: { id, isDeleted: false },
            relations: [
                'employee',
                'employee.department',
                'employee.position',
                'createdByEmployee',
                'requestType',
                'requestGroup',
                'overtimeType',
                'cancelledByEmployee',
            ],
        });
    }

    async findMyRequests({ employeeId, status, requestTypeId, startDate, endDate, skip = 0, limit = 20 }) {
        const query = this.repository.createQueryBuilder('r')
            .leftJoinAndSelect('r.employee', 'employee')
            .leftJoinAndSelect('r.requestType', 'requestType')
            .leftJoinAndSelect('r.requestGroup', 'requestGroup')
            .where('r.isDeleted = false')
            .andWhere('(r.employeeId = :empId OR r.createdByEmployeeId = :empId)', { empId: employeeId });

        if (status) query.andWhere('r.status = :status', { status });
        if (requestTypeId) query.andWhere('r.requestTypeId = :requestTypeId', { requestTypeId });
        if (startDate) query.andWhere('r.startDate >= :startDate', { startDate });
        if (endDate) query.andWhere('r.endDate <= :endDate', { endDate });

        const [items, total] = await query
            .orderBy('r.createdAt', 'DESC')
            .skip(skip).take(limit)
            .getManyAndCount();

        return { items, total };
    }

    async findPendingForApprover(approverEmployeeId, { skip = 0, limit = 20 } = {}) {
        // Lấy các đơn đang PENDING và người duyệt là approverEmployeeId
        // Bao gồm: Đơn đang chờ người này duyệt (Case A) HOẶC Đơn người này đã duyệt nhưng chưa kết thúc (Case B)
        const query = this.repository.createQueryBuilder('r')
            .innerJoin(
                'request_approval_levels',
                'level',
                'level.request_id = r.id AND level.approver_employee_id = :approverId AND level.is_deleted = false',
                { approverId: approverEmployeeId }
            )
            .leftJoinAndSelect('r.employee', 'employee')
            .leftJoinAndSelect('r.requestType', 'requestType')
            .leftJoinAndSelect('r.requestGroup', 'requestGroup')
            .where('r.status = :status', { status: 'PENDING' })
            .andWhere('r.isDeleted = false')
            .andWhere(
                '( (level.level_order = r.current_approval_level AND level.status = :pendingStatus) OR (level.status = :approvedStatus) )',
                { pendingStatus: 'PENDING', approvedStatus: 'APPROVED' }
            );

        const [items, total] = await query
            .orderBy('r.submittedAt', 'ASC')
            .skip(skip).take(limit)
            .getManyAndCount();

        return { items, total };
    }

    async findAll({ skip = 0, limit = 20, status, requestTypeId, employeeId, startDate, endDate } = {}) {
        const query = this.repository.createQueryBuilder('r')
            .leftJoinAndSelect('r.employee', 'employee')
            .leftJoinAndSelect('r.requestType', 'requestType')
            .leftJoinAndSelect('r.requestGroup', 'requestGroup')
            .where('r.isDeleted = false');

        if (status) query.andWhere('r.status = :status', { status });
        if (requestTypeId) query.andWhere('r.requestTypeId = :requestTypeId', { requestTypeId });
        if (employeeId) query.andWhere('r.employeeId = :employeeId', { employeeId });
        if (startDate) query.andWhere('r.startDate >= :startDate', { startDate });
        if (endDate) query.andWhere('r.endDate <= :endDate', { endDate });

        const [items, total] = await query
            .orderBy('r.createdAt', 'DESC')
            .skip(skip).take(limit)
            .getManyAndCount();

        return { items, total };
    }

    /**
     * Đơn giải trình: theo nhóm đơn (cùng logic timesheets.service — LATE_EARLY / ATTENDANCE_CORRECTION),
     * không dùng request_type_id cố định (tránh lệch dữ liệu giữa các môi trường).
     */
    async findExcuseRequests({
        month,
        year,
        departmentId,
        search,
        status,
        employeeId,
        skip = 0,
        limit = 20,
    } = {}) {
        const query = this.repository.createQueryBuilder('r')
            .leftJoinAndSelect('r.employee', 'employee')
            .leftJoinAndSelect('employee.department', 'department')
            .leftJoinAndSelect('employee.position', 'position')
            .leftJoinAndSelect('r.requestType', 'requestType')
            .leftJoinAndSelect('r.requestGroup', 'requestGroup')
            .where('r.isDeleted = false')
            .andWhere(
                new Brackets((qb) => {
                    qb.where('requestGroup.code IN (:...excuseGroupCodes)', {
                        excuseGroupCodes: [RequestGroupCode.LATE_EARLY, RequestGroupCode.ATTENDANCE_CORRECTION],
                    }).orWhere('r.requestTypeId = :legacyExcuseTypeId', { legacyExcuseTypeId: 2 });
                }),
            );

        if (status) query.andWhere('r.status = :status', { status });
        if (employeeId) query.andWhere('r.employeeId = :employeeId', { employeeId });
        if (departmentId) query.andWhere('employee.departmentId = :departmentId', { departmentId });

        if (year && month) {
            query.andWhere('YEAR(r.startDate) = :year AND MONTH(r.startDate) = :month', { year, month });
        } else if (year) {
            query.andWhere('YEAR(r.startDate) = :year', { year });
        }

        if (search) {
            query.andWhere(
                '(employee.fullName LIKE :search OR employee.employeeCode LIKE :search OR r.requestCode LIKE :search)',
                { search: `%${search}%` },
            );
        }

        const [items, total] = await query
            .orderBy('r.createdAt', 'DESC')
            .skip(skip)
            .take(limit)
            .getManyAndCount();

        return {
            items,
            total,
            page: Math.floor(skip / limit) + 1,
            limit,
        };
    }

    /**
     * Bảng tăng ca chi tiết: mỗi dòng = 1 bản ghi overtime_request_details (theo work_date trong kỳ),
     * hoặc 1 dòng tổng hợp từ requests khi đơn chưa có dòng chi tiết (dùng start_date / giờ trên đơn).
     */
    async findOvertimeDetailLinesForGroup({
        requestGroupId,
        month,
        year,
        departmentId,
        search,
        status,
        employeeId,
        skip = 0,
        limit = 20,
    } = {}) {
        const shared = { sql: '', params: [] };
        if (status) {
            shared.sql += ' AND r.status = ?';
            shared.params.push(status);
        }
        if (employeeId != null) {
            shared.sql += ' AND r.employee_id = ?';
            shared.params.push(employeeId);
        }
        if (departmentId != null) {
            shared.sql += ' AND e.department_id = ?';
            shared.params.push(departmentId);
        }
        if (search) {
            shared.sql += ' AND (e.full_name LIKE ? OR e.employee_code LIKE ? OR r.request_code LIKE ?)';
            const s = `%${search}%`;
            shared.params.push(s, s, s);
        }

        let detailDateSql = '';
        const detailDateParams = [];
        let headerDateSql = '';
        const headerDateParams = [];
        if (year != null && month != null) {
            detailDateSql = ' AND YEAR(otd.work_date) = ? AND MONTH(otd.work_date) = ?';
            detailDateParams.push(year, month);
            headerDateSql =
                ' AND r.start_date IS NOT NULL AND YEAR(r.start_date) = ? AND MONTH(r.start_date) = ?';
            headerDateParams.push(year, month);
        } else if (year != null) {
            detailDateSql = ' AND YEAR(otd.work_date) = ?';
            detailDateParams.push(year);
            headerDateSql = ' AND r.start_date IS NOT NULL AND YEAR(r.start_date) = ?';
            headerDateParams.push(year);
        }

        const detailFrom = `
            FROM overtime_request_details otd
            INNER JOIN requests r ON r.id = otd.request_id AND r.is_deleted = 0
            INNER JOIN employees e ON e.id = r.employee_id AND e.is_deleted = 0
            WHERE r.request_group_id = ?
              AND otd.is_deleted = 0
              ${detailDateSql}
              ${shared.sql}
        `;
        const headerFrom = `
            FROM requests r
            INNER JOIN employees e ON e.id = r.employee_id AND e.is_deleted = 0
            WHERE r.request_group_id = ?
              AND r.is_deleted = 0
              AND NOT EXISTS (
                  SELECT 1 FROM overtime_request_details x
                  WHERE x.request_id = r.id AND x.is_deleted = 0
              )
              ${headerDateSql}
              ${shared.sql}
        `;

        const countParams = [
            requestGroupId,
            ...detailDateParams,
            ...shared.params,
            requestGroupId,
            ...headerDateParams,
            ...shared.params,
        ];

        const countRows = await AppDataSource.query(
            `SELECT COUNT(*) AS total FROM (
                SELECT otd.id AS detail_id ${detailFrom}
                UNION ALL
                SELECT NULL AS detail_id ${headerFrom}
            ) t`,
            countParams,
        );
        const total = Number(countRows[0]?.total ?? 0);

        const listParams = [...countParams, limit, skip];
        const lineRows = await AppDataSource.query(
            `SELECT * FROM (
                SELECT otd.id AS detail_id, otd.work_date AS sort_date, r.id AS request_id
                ${detailFrom}
                UNION ALL
                SELECT NULL AS detail_id, r.start_date AS sort_date, r.id AS request_id
                ${headerFrom}
            ) u
            ORDER BY u.sort_date DESC, u.request_id DESC, (u.detail_id IS NULL) ASC, u.detail_id DESC
            LIMIT ? OFFSET ?`,
            listParams,
        );

        const detailIds = lineRows.map((row) => row.detail_id).filter((id) => id != null);
        const requestIds = [...new Set(lineRows.map((row) => row.request_id).filter(Boolean))];

        const detailEntities =
            detailIds.length > 0
                ? await this.otdRepository.find({
                      where: { id: In(detailIds.map((id) => Number(id))) },
                      relations: ['overtimeRule', 'overtimeRule.overtimeType'],
                  })
                : [];

        const fullRequests =
            requestIds.length > 0
                ? await this.repository.find({
                      where: { id: In(requestIds) },
                      relations: ['employee', 'employee.department', 'employee.position', 'requestType', 'requestGroup'],
                  })
                : [];

        const reqById = new Map(fullRequests.map((req) => [req.id, req]));
        const detailById = new Map(detailEntities.map((d) => [d.id, d]));

        const items = [];
        for (const row of lineRows) {
            const rid = Number(row.request_id);
            if (row.detail_id != null) {
                const d = detailById.get(Number(row.detail_id));
                if (!d) continue;
                d.request = reqById.get(rid);
                items.push(d);
            } else {
                const r = reqById.get(rid);
                if (!r) continue;
                items.push({
                    id: `hdr-${r.id}`,
                    workDate: r.startDate,
                    startTime: r.startTime,
                    endTime: r.endTime,
                    totalHours: r.quantity != null ? Number(r.quantity) : null,
                    overtimeRule: null,
                    request: r,
                });
            }
        }

        return {
            items,
            total,
            page: Math.floor(skip / limit) + 1,
            limit,
        };
    }

    async create(data) {
        const entity = this.repository.create(data);
        return await this.repository.save(entity);
    }

    async update(id, data) {
        await this.repository.update(id, data);
        return await this.findById(id);
    }

    // ─── APPROVAL LEVELS ────────────────────────────────────────────────
    async createApprovalLevels(levels) {
        const entities = this.approvalRepo.create(levels);
        return await this.approvalRepo.save(entities);
    }

    async getApprovalLevels(requestId) {
        return await this.approvalRepo.find({
            where: { requestId, isDeleted: false },
            relations: ['approver', 'actionedBy', 'approverRole'],
            order: { levelOrder: 'ASC' },
        });
    }

    async getApprovalLevel(requestId, levelOrder) {
        return await this.approvalRepo.findOne({
            where: { requestId, levelOrder, isDeleted: false },
            relations: ['approver', 'approverRole'],
        });
    }

    async updateApprovalLevel(id, data) {
        await this.approvalRepo.update(id, data);
        return await this.approvalRepo.findOne({ where: { id }, relations: ['approver'] });
    }

    // ─── ATTACHMENTS ────────────────────────────────────────────────────
    async createAttachments(attachments) {
        const entities = this.attachmentRepo.create(attachments);
        return await this.attachmentRepo.save(entities);
    }

    async getAttachments(requestId) {
        return await this.attachmentRepo.find({
            where: { requestId, isDeleted: false },
            order: { createdAt: 'ASC' },
        });
    }

    async deleteAttachment(id) {
        await this.attachmentRepo.update(id, { isDeleted: true, deletedAt: new Date() });
    }

    // ─── GENERATE CODE ──────────────────────────────────────────────────
    async generateRequestCode() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const datePart = `${year}${month}${day}`;

        const lastRequest = await this.repository
            .createQueryBuilder('r')
            .where('r.requestCode LIKE :prefix', { prefix: `REQ-${datePart}-%` })
            .withDeleted()
            .orderBy('r.requestCode', 'DESC')
            .getOne();

        let seq = 1;
        if (lastRequest && lastRequest.requestCode) {
            const parts = lastRequest.requestCode.split('-');
            const lastSeq = parseInt(parts[parts.length - 1], 10);
            if (!isNaN(lastSeq)) {
                seq = lastSeq + 1;
            }
        }

        const seqStr = String(seq).padStart(4, '0');
        return `REQ-${datePart}-${seqStr}`;
    }

    /**
     * Lấy các đơn đã PENDING/APPROVED trong khoảng thời gian để tính quota đã dùng
     * @param {number} employeeId
     * @param {number} requestTypeId
     * @param {Date} periodStart - đầu chu kỳ
     * @param {Date} periodEnd - cuối chu kỳ
     * @param {number|null} excludeRequestId - loại trừ đơn này (khi đang edit)
     */
    async findUsedRequests({ employeeId, requestTypeId, periodStart, periodEnd, excludeRequestId = null }) {
        const query = this.repository
            .createQueryBuilder('r')
            .where('r.isDeleted = false')
            .andWhere('r.employeeId = :employeeId', { employeeId })
            .andWhere('r.requestTypeId = :requestTypeId', { requestTypeId })
            .andWhere('r.status IN (:...statuses)', { statuses: ['PENDING', 'APPROVED'] })
            .andWhere('r.startDate IS NOT NULL')
            .andWhere('r.endDate IS NOT NULL')
            // Chỉ lấy các đơn giao nhau với chu kỳ
            .andWhere('r.startDate <= :periodEnd', { periodEnd: periodEnd.toISOString().slice(0, 10) })
            .andWhere('r.endDate >= :periodStart', { periodStart: periodStart.toISOString().slice(0, 10) });

        if (excludeRequestId) {
            query.andWhere('r.id != :excludeId', { excludeId: excludeRequestId });
        }

        return await query.getMany();
    }

    /**
     * Tìm các đơn từ khác trong cùng nhóm bị trùng lặp thời gian
     */
    async findOverlappingRequests({ employeeId, requestGroupId, startDate, endDate, excludeRequestId = null }) {
        const query = this.repository
            .createQueryBuilder('r')
            .where('r.isDeleted = false')
            .andWhere('r.employeeId = :employeeId', { employeeId })
            .andWhere('r.requestGroupId = :requestGroupId', { requestGroupId })
            // Chỉ bắt trùng với những đơn đã gửi duyệt hoặc đã duyệt
            .andWhere('r.status IN (:...statuses)', { statuses: ['PENDING', 'APPROVED'] })
            .andWhere('r.startDate IS NOT NULL')
            .andWhere('r.endDate IS NOT NULL')
            // Điều kiện trùng lặp: start1 <= end2 AND end1 >= start2
            .andWhere('r.startDate <= :endDate', { endDate: endDate.toISOString().slice(0, 10) })
            .andWhere('r.endDate >= :startDate', { startDate: startDate.toISOString().slice(0, 10) });

        if (excludeRequestId) {
            query.andWhere('r.id != :excludeId', { excludeId: excludeRequestId });
        }

        return await query.getMany();
    }
}

