import { PositionsRepository } from '../repositories/positions.repository.js';

export class PositionsService {
    constructor() {
        this.positionsRepository = new PositionsRepository();
    }

    async findAll() {
        return this.positionsRepository.findAll();
    }

    async findById(id) {
        return this.positionsRepository.findById(id);
    }

    async create(data) {
        return this.positionsRepository.create(data);
    }

    async update(id, data) {
        return this.positionsRepository.update(id, data);
    }

    async remove(id) {
        return this.positionsRepository.delete(id);
    }

    async findList() {
        return this.positionsRepository.findList();
    }
}
