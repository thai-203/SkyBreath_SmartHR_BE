import { Like } from 'typeorm';
import { AppDataSource } from '../database/data-source.js';
import { RolePermissionEntity } from '../models/entities/role-permission.entity.js';
import { RoleEntity } from '../models/entities/role.entity.js';
import { UserRoleEntity } from '../models/entities/user-role.entity.js';


export class RolesRepository {
    get repository() {
        return AppDataSource.getRepository(RoleEntity);
    }

    async create(data) {
        const role = this.repository.create(data);
        return this.repository.save(role);
    }

    async findAll(filters = {}) {
        const { search, status } = filters;
        const where = { isDeleted: false };

        if (search) {
            where.roleName = Like(`%${search}%`);
        }

        if (status) {
            where.status = status;
        }

        return this.repository.find({
            where,
            order: { createdAt: 'DESC' }
        });
    }

    async findById(id) {
        return this.repository.findOne({ where: { id } });
    }

    async findByName(roleName) {
        return this.repository.findOne({
            where: { roleName },
            withDeleted: true
        });
    }

    async findByIds(ids) {
        return this.repository.findByIds(ids);
    }

    async update(id, data) {
        await this.repository.update(id, data);
        const updated = await this.findById(id);
        if (!updated) {
            throw new Error('Role not found');
        }
        return updated;
    }

    async delete(id) {
        await this.repository.softDelete(id);
    }

    async findByNameExcludeId(name, excludeId) {
        return this.repository.createQueryBuilder('role')
            .withDeleted()
            .where('role.role_name = :name', { name })
            .andWhere('role.id != :excludeId', { excludeId })
            .getOne();
    }

    async isRoleInUse(roleId) {
        const count = await this.repository.manager.getRepository(UserRoleEntity)
            .createQueryBuilder('userRole')
            .where('userRole.role_id = :roleId', { roleId })
            .getCount();
        return count > 0;
    }
    async updatePermissions(roleId, permissionIds) {
        return this.repository.manager.transaction(async (transactionalEntityManager) => {
            // Delete existing permissions
            await transactionalEntityManager.delete(RolePermissionEntity, { roleId });

            // Insert new permissions
            if (permissionIds && permissionIds.length > 0) {
                const rolePermissions = permissionIds.map(permissionId => ({
                    roleId,
                    permissionId
                }));
                await transactionalEntityManager.save(RolePermissionEntity, rolePermissions);
            }
        });
    }

    async getPermissions(roleId) {
        const rolePermissions = await this.repository.manager.getRepository(RolePermissionEntity)
            .find({
                where: { roleId },
                relations: ['permission']
            });
        return rolePermissions.map(rp => rp.permission);
    }
}
