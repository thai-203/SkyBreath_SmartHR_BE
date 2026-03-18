import { OvertimeRulesRepository } from '../repositories/overtime-rules.repository.js';
import { NotFoundException } from '../common/exceptions/index.js';

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
        return this.overtimeRulesRepository.create(data);
    }

    async update(id, data) {
        await this.findById(id); // kiểm tra tồn tại
        return this.overtimeRulesRepository.update(id, data);
    }

    async remove(id) {
        await this.findById(id); // kiểm tra tồn tại
        return this.overtimeRulesRepository.delete(id);
    }
}
