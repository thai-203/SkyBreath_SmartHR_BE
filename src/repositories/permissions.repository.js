import { AppDataSource } from '../database/data-source.js';
import { PermissionEntity } from '../models/entities/permission.entity.js';

export class PermissionsRepository {
    constructor() {
        this.permissionRepository = AppDataSource.getRepository(PermissionEntity);
    }

    async findAll() {
        return this.permissionRepository.find();
    }
}
