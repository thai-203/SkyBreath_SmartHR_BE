import { AppDataSource } from '../database/data-source.js';
import { PermissionEntity } from '../models/entities/permission.entity.js';

export class PermissionsRepository {
    get repository() {
        return AppDataSource.getRepository(PermissionEntity);
    }

    async findAll(params = {}) {
        const { search, module, page = 1, limit = 10, sortField = 'permissionCode', sortOrder = 'ASC' } = params;
        const query = this.repository.createQueryBuilder('permission');

        if (search) {
            query.where('(permission.permissionCode LIKE :search OR permission.description LIKE :search)', {
                search: `%${search}%`
            });
        }

        if (module && module !== 'all') {
            const moduleCondition = 'permission.module = :module';
            if (search) {
                query.andWhere(moduleCondition, { module });
            } else {
                query.where(moduleCondition, { module });
            }
        }

        // Sorting mapping if field names differ from entity properties
        const sortMapping = {
            permissionCode: 'permission.permissionCode',
            description: 'permission.description',
            module: 'permission.module',
            createdAt: 'permission.createdAt'
        };

        const field = sortMapping[sortField] || 'permission.permissionCode';
        query.orderBy(field, sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC');

        const [data, total] = await query
            .skip((page - 1) * limit)
            .take(limit)
            .getManyAndCount();

        return {
            data,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async findById(id) {
        return this.repository.findOneBy({ id });
    }

    async findByCode(permissionCode) {
        return this.repository.findOne({
            where: { permissionCode },
            withDeleted: true
        });
    }

    async create(data) {
        const permission = this.repository.create(data);
        return this.repository.save(permission);
    }

    async update(id, data) {
        await this.repository.update(id, data);
        return this.findById(id);
    }

    async delete(id) {
        const result = await this.repository.softDelete(id);
        return result.affected > 0;
    }
}
