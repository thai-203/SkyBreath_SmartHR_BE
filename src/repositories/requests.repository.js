import { AppDataSource } from '../database/data-source.js';
import { RequestEntity } from '../models/entities/request.entity.js';
import { RequestApprovalLevelEntity } from '../models/entities/request-approval-level.entity.js';
import { RequestAttachmentEntity } from '../models/entities/request-attachment.entity.js';

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
}
