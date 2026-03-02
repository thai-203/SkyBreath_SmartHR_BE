export class PermissionsService {
    constructor(permissionsRepository) {
        this.permissionsRepository = permissionsRepository;
    }

    async findAll() {
        try {
            console.log('[Service] PermissionsService.findAll - Fetching from repository');
            const permissions = await this.permissionsRepository.findAll();
            console.log(`[Service] PermissionsService.findAll - Found ${permissions?.length || 0} raw records`);

            if (!permissions) return [];

            return permissions.map(p => {
                if (!p) return null;
                const code = p.permissionCode || 'UNKNOWN:UNKNOWN';
                const parts = code.split(':');
                const module = parts.length > 1 ? parts[0] : 'GENERAL';
                return {
                    id: p.id,
                    permissionCode: code,
                    description: p.description,
                    module: module
                };
            }).filter(Boolean);
        } catch (error) {
            console.error('[Service] PermissionsService.findAll - Error:', error);
            throw error;
        }
    }

    async findById(id) {
        return this.permissionsRepository.findById(id);
    }

    async create(data) {
        const existing = await this.permissionsRepository.findByCode(data.permissionCode);
        if (existing) {
            const error = new Error('Permission code already exists');
            error.statusCode = 400;
            throw error;
        }
        return this.permissionsRepository.create(data);
    }

    async update(id, data) {
        const permission = await this.findById(id);
        if (!permission) {
            const error = new Error('Permission not found');
            error.statusCode = 404;
            throw error;
        }
        return this.permissionsRepository.update(id, data);
    }

    async delete(id) {
        const permission = await this.findById(id);
        if (!permission) {
            const error = new Error('Permission not found');
            error.statusCode = 404;
            throw error;
        }
        return this.permissionsRepository.delete(id);
    }
}
