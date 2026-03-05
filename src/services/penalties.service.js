import { PenaltiesRepository } from '../repositories/penalties.repository.js';
import { NotFoundException } from '../common/exceptions/index.js';

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
            throw new NotFoundException(`Hình phạt với ID ${id} không tìm thấy`);
        }
        return penalty;
    }

    async create(data) {
        return this.penaltiesRepository.create(data);
    }

    async update(id, data) {
        await this.findById(id);
        return this.penaltiesRepository.update(id, data);
    }

    async remove(id) {
        await this.findById(id);
        return this.penaltiesRepository.delete(id);
    }
}
