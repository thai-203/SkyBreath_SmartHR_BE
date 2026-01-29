import { AppDataSource } from '../database/data-source.js';
import { RoleEntity } from '../models/entities/role.entity.js';

export class RolesRepository {
    constructor() {
        this.roleRepository = AppDataSource.getRepository(RoleEntity);
    }

    async create(data) {
        const role = this.roleRepository.create(data);
        return this.roleRepository.save(role);
    }

    async findAll() {
        return this.roleRepository.find({ where: { isDeleted: false } });
    }

    async findById(id) {
        return this.roleRepository.findOne({ where: { id } });
    }

    async findByName(roleName) {
        return this.roleRepository.findOne({ where: { roleName } });
    }

    async findByIds(ids) {
        return this.roleRepository.findByIds(ids);
    }

    async update(id, data) {
        await this.roleRepository.update(id, data);
        const updated = await this.findById(id);
        if (!updated) {
            throw new Error('Role not found');
        }
        return updated;
    }

    async delete(id) {
        await this.roleRepository.softDelete(id);
    }
}
