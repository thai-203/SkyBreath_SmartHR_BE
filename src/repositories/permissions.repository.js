import { AppDataSource } from '../database/data-source.js';
import { PermissionEntity } from '../models/entities/permission.entity.js';

export class PermissionsRepository {
    constructor() {
        this.permissionRepository = AppDataSource.getRepository(PermissionEntity);
    }

    async findAll() {
        return this.permissionRepository.find();
    }

    async findById(id) {
        return this.permissionRepository.findOneBy({ id });
    }

    async findByCode(permissionCode) {
        return this.permissionRepository.findOneBy({ permissionCode });
    }

    async create(data) {
        const permission = this.permissionRepository.create(data);
        return this.permissionRepository.save(permission);
    }

    async update(id, data) {
        await this.permissionRepository.update(id, data);
        return this.findById(id);
    }

    async delete(id) {
        const result = await this.permissionRepository.delete(id);
        return result.affected > 0;
    }
}
