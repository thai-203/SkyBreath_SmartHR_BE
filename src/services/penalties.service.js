import { PenaltiesRepository } from '../repositories/penalties.repository.js';
import { NotFoundException, ConflictException, BadRequestException } from '../common/exceptions/index.js';

export class PenaltiesService {
    constructor() {
        this.penaltiesRepository = new PenaltiesRepository();
    }

    async findAll(options = {}) {
        return this.penaltiesRepository.findAll(options);
    }

    async findById(id) {
        const penalty = await this.penaltiesRepository.findById(id);
        if (!penalty) {
            throw new NotFoundException(`Quy định vi phạm với ID ${id} không tìm thấy`);
        }
        return penalty;
    }

    async create(data) {
        // Validate ngày
        this._validateDates(data.effectiveFrom, data.effectiveTo);

        // Validate fromMinute < toMinute
        this._validateMinuteRange(data.fromMinute, data.toMinute);

        // Validate xung đột
        if (data.status !== 'INACTIVE') {
            await this._validateNoOverlap(
                data.violationType,
                data.effectiveFrom,
                data.effectiveTo,
                data.fromMinute,
                data.toMinute,
                null
            );
        }

        return this.penaltiesRepository.create(data);
    }

    async update(id, data) {
        const existing = await this.findById(id);

        // Merge values
        const violationType = data.violationType ?? existing.violationType;
        const effectiveFrom = data.effectiveFrom ?? existing.effectiveFrom;
        const effectiveTo = data.effectiveTo !== undefined ? data.effectiveTo : existing.effectiveTo;
        const fromMinute = data.fromMinute ?? existing.fromMinute;
        const toMinute = data.toMinute ?? existing.toMinute;
        const status = data.status ?? existing.status;

        // Validate ngày
        this._validateDates(effectiveFrom, effectiveTo);

        // Validate fromMinute < toMinute
        this._validateMinuteRange(fromMinute, toMinute);

        // Validate xung đột nếu ACTIVE
        if (status === 'ACTIVE') {
            await this._validateNoOverlap(
                violationType,
                effectiveFrom,
                effectiveTo,
                fromMinute,
                toMinute,
                id
            );
        }

        return this.penaltiesRepository.update(id, data);
    }

    async remove(id) {
        await this.findById(id);
        return this.penaltiesRepository.delete(id);
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
                throw new BadRequestException('Ngày hết hiệu lực phải sau ngày hiệu lực.');
            }
        }
    }

    /** Kiểm tra fromMinute < toMinute */
    _validateMinuteRange(fromMinute, toMinute) {
        if (fromMinute !== undefined && toMinute !== undefined && fromMinute >= toMinute) {
            throw new BadRequestException(
                `Thời gian từ (${fromMinute} phút) phải nhỏ hơn thời gian đến (${toMinute} phút).`
            );
        }
    }

    /**
     * Kiểm tra xung đột:
     * Cùng violationType + Ngày hiệu lực chồng chéo + Khoảng phút chồng chéo
     */
    async _validateNoOverlap(violationType, effectiveFrom, effectiveTo, fromMinute, toMinute, excludeId) {
        const overlapping = await this.penaltiesRepository.findOverlapping(
            violationType, effectiveFrom, effectiveTo, fromMinute, toMinute, excludeId
        );

        if (overlapping.length > 0) {
            const c = overlapping[0];
            const label = c.violationType === 'LATE' ? 'Đi muộn' : 'Về sớm';
            throw new ConflictException(
                `Khoảng phút [${fromMinute}-${toMinute}] bị trùng với quy định "${label}" [${c.fromMinute}-${c.toMinute}] ` +
                `(hiệu lực ${c.effectiveFrom} → ${c.effectiveTo || 'Vô thời hạn'}). Không thể tạo/cập nhật.`
            );
        }
    }
}
