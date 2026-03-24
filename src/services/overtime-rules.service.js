import { OvertimeRulesRepository } from '../repositories/overtime-rules.repository.js';
import { NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '../common/exceptions/index.js';
import { AppDataSource } from '../database/data-source.js';
import { OvertimeTypeEntity } from '../models/entities/overtime-type.entity.js';
import { DepartmentEntity } from '../models/entities/department.entity.js';
import { In } from 'typeorm';

export class OvertimeRulesService {
    constructor() {
        this.overtimeRulesRepository = new OvertimeRulesRepository();
    }

    async findAll(options = {}) {
        return this.overtimeRulesRepository.findAll(options);
    }

    async findById(id) {
        const rule = await this.overtimeRulesRepository.findById(id);
        if (!rule) {
            throw new NotFoundException(`Quy định OT với ID ${id} không tìm thấy`);
        }
        return rule;
    }

    async create(data) {
        // Validate ngày
        this._validateDates(data.effectiveFrom, data.effectiveTo);
        // Validate FK overtimeTypeId
        if (data.overtimeTypeId) {
            await this._validateOvertimeTypeExists(data.overtimeTypeId);
        }
        // Validate FK departmentIds
        if (data.departmentIds && data.departmentIds.length > 0) {
            await this._validateDepartmentIdsExist(data.departmentIds);
        }
        if (data.versionStatus === 'ACTIVE' && data.effectiveFrom) {
            await this._validateNoOverlap(data.overtimeTypeId, data.effectiveFrom, data.effectiveTo, null);
        }
        return this.overtimeRulesRepository.create(data);
    }

    async update(id, data) {
        const existing = await this.findById(id);

        if (existing.versionStatus === 'ACTIVE' && data.versionStatus === 'DRAFT') {
            throw new BadRequestException('Không thể chuyển quy định đã kích hoạt (ACTIVE) về bản nháp (DRAFT).');
        }

        // Validate ngày nếu có truyền effectiveFrom hoặc effectiveTo
        const from = data.effectiveFrom ?? existing.effectiveFrom;
        const to = data.effectiveTo !== undefined ? data.effectiveTo : existing.effectiveTo;
        this._validateDates(from, to);

        // Validate FK overtimeTypeId nếu được thay đổi
        if (data.overtimeTypeId && data.overtimeTypeId !== existing.overtimeTypeId) {
            await this._validateOvertimeTypeExists(data.overtimeTypeId);
        }
        // Validate FK departmentIds nếu được thay đổi
        if (data.departmentIds && data.departmentIds.length > 0) {
            await this._validateDepartmentIdsExist(data.departmentIds);
        }

        const usage = await this.overtimeRulesRepository.getUsageStatus(id);

        if (usage.hasPayroll) {
            // Nếu đã tính lương => Khóa hoàn toàn, chỉ cho phép Expire (đóng ngày)
            const keysToChange = Object.keys(data).filter(
                k => data[k] !== undefined && k !== 'versionStatus' && k !== 'effectiveTo'
            );

            const hasActualChanges = keysToChange.some(k => {
                if (k === 'effectiveFrom') {
                    const newDate = data[k] ? new Date(data[k]).toISOString().split('T')[0] : null;
                    const oldDate = existing[k] ? new Date(existing[k]).toISOString().split('T')[0] : null;
                    return newDate !== oldDate;
                }
                return String(data[k]) !== String(existing[k]);
            });

            if (hasActualChanges) {
                throw new ForbiddenException(
                    "Quy định này đã được ĐƯA VÀO BẢNG LƯƠNG. Toàn bộ thông tin quan trọng bị khóa hoàn toàn. Bạn chỉ có thể sửa ngày kết thúc để ngưng áp dụng."
                );
            }
        } else if (usage.hasRequests) {
            // Nếu mới có đăng ký => Cấm sửa trường nhạy cảm
            const criticalFields = ['salaryMultiplier', 'maxHoursPerDay', 'maxHoursPerMonth', 'overtimeTypeId', 'effectiveFrom'];

            const attemptedCriticalEdits = criticalFields.filter(field => {
                if (data[field] === undefined) return false;

                if (field === 'effectiveFrom') {
                    const newDate = data[field] ? new Date(data[field]).toISOString().split('T')[0] : null;
                    const oldDate = existing[field] ? new Date(existing[field]).toISOString().split('T')[0] : null;
                    return newDate !== oldDate;
                }

                if (field === 'salaryMultiplier' || field === 'maxHoursPerDay' || field === 'maxHoursPerMonth') {
                    return Number(data[field]) !== Number(existing[field]);
                }
                return String(data[field]) !== String(existing[field]);
            });

            if (attemptedCriticalEdits.length > 0) {
                throw new ForbiddenException(
                    "Quy định này đã có nhân viên ĐĂNG KÝ OT. Không thể sửa Hệ số lương, Giờ tối đa, Loại OT hay Ngày áp dụng. Bạn chỉ có thể sửa tên hoặc ngày kết thúc."
                );
            }
        }

        if (data.effectiveFrom || data.overtimeTypeId) {
            const typeId = data.overtimeTypeId || existing.overtimeTypeId;
            const newStatus = data.versionStatus || existing.versionStatus;

            if (newStatus === 'ACTIVE') {
                await this._validateNoOverlap(typeId, from, to, id);
            }
        }

        return this.overtimeRulesRepository.update(id, data);
    }

    async activate(id) {
        const rule = await this.findById(id);

        if (rule.versionStatus === 'EXPIRED') {
            throw new ForbiddenException('Không thể kích hoạt policy đã EXPIRED.');
        }
        if (rule.versionStatus === 'ACTIVE') {
            throw new ConflictException('Policy này đã ở trạng thái ACTIVE.');
        }

        // Thực hiện auto versioning: đóng policy cũ và activate policy mới mà không gây validation overlap 
        return this.overtimeRulesRepository.activateWithAutoVersioning(rule);
    }

    async remove(id) {
        await this.findById(id);
        const usage = await this.overtimeRulesRepository.getUsageStatus(id);
        if (usage.hasRequests || usage.hasPayroll) {
            throw new ForbiddenException('Không thể xóa quy định đã có dữ liệu OT phát sinh.');
        }
        return this.overtimeRulesRepository.delete(id);
    }

    // ─────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────

    /** Kiểm tra effectiveTo phải sau effectiveFrom */
    _validateDates(effectiveFrom, effectiveTo) {
        if (effectiveFrom && effectiveTo) {
            const from = new Date(effectiveFrom);
            const to = new Date(effectiveTo);
            if (to <= from) {
                throw new BadRequestException('Ngày kết thúc hiệu lực (effectiveTo) phải sau ngày bắt đầu (effectiveFrom).');
            }
        }
    }

    /** Kiểm tra overtimeTypeId tồn tại trong DB → 404 thay vì 500 */
    async _validateOvertimeTypeExists(overtimeTypeId) {
        const repo = AppDataSource.getRepository(OvertimeTypeEntity);
        const exists = await repo.findOne({ where: { id: overtimeTypeId } });
        if (!exists) {
            throw new NotFoundException(`Loại OT với ID ${overtimeTypeId} không tồn tại.`);
        }
    }

    /** Kiểm tra từng departmentId tồn tại trong DB → 400 thay vì FK 500 */
    async _validateDepartmentIdsExist(departmentIds) {
        const repo = AppDataSource.getRepository(DepartmentEntity);
        const found = await repo.find({ where: { id: In(departmentIds), isDeleted: false } });
        const foundIds = found.map(d => d.id);
        const invalidIds = departmentIds.filter(id => !foundIds.includes(id));
        if (invalidIds.length > 0) {
            throw new BadRequestException(`Các phòng ban không tồn tại: ID [${invalidIds.join(', ')}].`);
        }
    }

    async _validateNoOverlap(overtimeTypeId, effectiveFrom, effectiveTo, excludeId) {
        const overlapping = await this.overtimeRulesRepository.findOverlapping(
            overtimeTypeId, effectiveFrom, effectiveTo, excludeId
        );
        if (overlapping.length > 0) {
            const conflict = overlapping[0];
            throw new ConflictException(
                `Khoảng thời gian hiệu lực bị trùng với quy định "${conflict.name}" (${conflict.effectiveFrom} → ${conflict.effectiveTo || 'nay'}).`
            );
        }
    }
}
