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
        if (data.versionStatus && data.versionStatus !== 'DRAFT' && data.effectiveFrom) {
            await this._validateNoOverlap(data.overtimeTypeId, data.effectiveFrom, data.effectiveTo, null);
        }
        return this.overtimeRulesRepository.create(data);
    }

    async update(id, data) {
        const existing = await this.findById(id);

        if (existing.versionStatus === 'ACTIVE' && data.versionStatus === 'DRAFT') {
            throw new BadRequestException('Không thể chuyển quy định đã kích hoạt (ACTIVE) về bản nháp (DRAFT).');
        }

        if (existing.versionStatus === 'ACTIVE') {
            const hasRequests = await this.overtimeRulesRepository.hasLinkedRequests(id);
            if (hasRequests) {
                throw new ForbiddenException(
                    'Không thể sửa quy định đã có dữ liệu OT. Hãy tạo phiên bản mới (DRAFT).'
                );
            }
        }

        if (data.effectiveFrom || data.overtimeTypeId) {
            const typeId = data.overtimeTypeId || existing.overtimeTypeId;
            const from = data.effectiveFrom || existing.effectiveFrom;
            const to = data.effectiveTo !== undefined ? data.effectiveTo : existing.effectiveTo;
            const newStatus = data.versionStatus || existing.versionStatus;

            if (newStatus !== 'DRAFT') {
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

        await this._validateNoOverlap(rule.overtimeTypeId, rule.effectiveFrom, rule.effectiveTo, id);
        return this.overtimeRulesRepository.activate(id, rule.overtimeTypeId);
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
