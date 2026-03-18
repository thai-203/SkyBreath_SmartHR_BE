import { AppMessages } from '../common/constants/index.js';
import { ConflictException, NotFoundException } from '../common/exceptions/index.js';

export class PermissionsService {
    constructor(permissionsRepository) {
        this.permissionsRepository = permissionsRepository;
    }

    async findAll(params = {}) {
        try {
            const result = await this.permissionsRepository.findAll(params);

            const mappedData = result.data.map(p => {
                if (!p) return null;
                const code = p.permissionCode || 'UNKNOWN:UNKNOWN';
                const parts = code.split(':');
                const module = p.module || (parts.length > 1 ? parts[0] : 'GENERAL');
                return {
                    id: p.id,
                    permissionCode: code,
                    description: p.description,
                    module: module
                };
            }).filter(Boolean);

            return {
                data: mappedData,
                meta: result.meta
            };
        } catch (error) {
            console.error('[Service] PermissionsService.findAll - Error:', error);
            throw error;
        }
    }

    async findById(id) {
        const permission = await this.permissionsRepository.findById(id);
        if (!permission) {
            throw new NotFoundException(AppMessages.Errors.Permission.NOT_FOUND);
        }
        return permission;
    }

    async create(data) {
        const existing = await this.permissionsRepository.findByCode(data.permissionCode);
        if (existing) {
            throw new ConflictException(AppMessages.Errors.Permission.ALREADY_EXISTS);
        }
        return this.permissionsRepository.create(data);
    }

    async update(id, data) {
        await this.findById(id);

        if (data.permissionCode) {
            const existing = await this.permissionsRepository.findByCode(data.permissionCode);
            if (existing && existing.id !== id) {
                throw new ConflictException(AppMessages.Errors.Permission.ALREADY_EXISTS);
            }
        }

        return this.permissionsRepository.update(id, data);
    }

    async delete(id) {
        await this.findById(id);
        return this.permissionsRepository.delete(id);
    }
}
