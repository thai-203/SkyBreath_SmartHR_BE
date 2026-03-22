import { OvertimeRulesRepository } from '../repositories/overtime-rules.repository.js';
import { NotFoundException, ConflictException, ForbiddenException, BadRequestException } from '../common/exceptions/index.js';

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
            const from = data.effectiveFrom || existing.effectiveFrom;
            const to = data.effectiveTo !== undefined ? data.effectiveTo : existing.effectiveTo;
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
        const hasRequests = await this.overtimeRulesRepository.hasLinkedRequests(id);
        if (hasRequests) {
            throw new ForbiddenException('Không thể xóa quy định đã có dữ liệu OT phát sinh.');
        }
        return this.overtimeRulesRepository.delete(id);
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
