import { AppMessages } from '../common/constants/index.js';
import { ConflictException } from '../common/exceptions/conflict.exception.js';
import { NotFoundException } from '../common/exceptions/not-found.exception.js';

export class RolesService {
    constructor(rolesRepository) {
        this.rolesRepository = rolesRepository;
    }

    async create(createRoleDto) {
        try {
            const existingRole = await this.rolesRepository.findByName(createRoleDto.name);
            if (existingRole) {
                throw new ConflictException(AppMessages.Errors.Role.ALREADY_EXISTS);
            }
            return await this.rolesRepository.create({
                roleName: createRoleDto.name,
                description: createRoleDto.description,
                status: createRoleDto.status || 'active'
            });
        } catch (error) {
            console.error('[RolesService] Error in create:', error);
            throw error;
        }
    }

    async findAll(query = {}) {
        const filters = {
            search: query.search || '',
            status: query.status || null
        };
        return this.rolesRepository.findAll(filters);
    }

    async findById(id) {
        const role = await this.rolesRepository.findById(id);
        if (!role) {
            throw new NotFoundException(AppMessages.Errors.Role.NOT_FOUND);
        }
        return role;
    }

    async update(id, updateRoleDto) {
        const role = await this.findById(id);

        if (updateRoleDto.name) {
            // Check if name is taken by another role
            const existingRole = await this.rolesRepository.findByNameExcludeId(updateRoleDto.name, id);
            if (existingRole) {
                throw new ConflictException(AppMessages.Errors.Role.ALREADY_EXISTS);
            }
            role.roleName = updateRoleDto.name;
        }

        if (updateRoleDto.description !== undefined) role.description = updateRoleDto.description;
        if (updateRoleDto.status) role.status = updateRoleDto.status;

        // Prevent modification of sensitive fields for system roles if needed
        // if (role.isSystem && updateRoleDto.name && updateRoleDto.name !== role.roleName) {
        //     throw new ConflictException('Cannot rename system roles');
        // }

        return this.rolesRepository.update(id, {
            roleName: role.roleName,
            description: role.description,
            status: role.status,
            // isSystem: role.isSystem // Usually not updated via API
        });
    }

    async remove(id) {
        const role = await this.findById(id);

        if (role.isSystem) {
            throw new ConflictException(AppMessages.Errors.Role.SYSTEM_ROLE);
        }

        const isInUse = await this.rolesRepository.isRoleInUse(id);
        if (isInUse) {
            throw new ConflictException(AppMessages.Errors.Role.IN_USE);
        }

        await this.rolesRepository.delete(id);
    }

    async assignPermissions(id, permissionIds) {
        await this.findById(id);
        await this.rolesRepository.updatePermissions(id, permissionIds);
        return this.getPermissions(id);
    }

    async getPermissions(id) {
        await this.findById(id);
        return this.rolesRepository.getPermissions(id);
    }
}
