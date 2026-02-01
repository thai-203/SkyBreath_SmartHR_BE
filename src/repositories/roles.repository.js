import { AppDataSource } from '../database/data-source.js';
import { RolePermissionEntity } from '../models/entities/role-permission.entity.js';
import { RoleEntity } from '../models/entities/role.entity.js';
import { UserRoleEntity } from '../models/entities/user-role.entity.js';


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

    async findByNameExcludeId(name, excludeId) {
        return this.roleRepository.createQueryBuilder('role')
            .where('role.role_name = :name', { name })
            .andWhere('role.id != :excludeId', { excludeId })
            .getOne();
    }

    async isRoleInUse(roleId) {
        const count = await this.roleRepository.manager.getRepository(UserRoleEntity)
            .createQueryBuilder('userRole')
            .where('userRole.role_id = :roleId', { roleId })
            .getCount();
        return count > 0;
    }
    async updatePermissions(roleId, permissionIds) {
        return this.roleRepository.manager.transaction(async (transactionalEntityManager) => {
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
        const rolePermissions = await this.roleRepository.manager.getRepository(RolePermissionEntity)
            .find({
                where: { roleId },
                relations: ['permission']
            });
        return rolePermissions.map(rp => rp.permission);
    }
}
