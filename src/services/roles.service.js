import { AppMessages } from '../common/constants/index.js';
import { ConflictException } from '../common/exceptions/conflict.exception.js';
import { NotFoundException } from '../common/exceptions/not-found.exception.js';

export class RolesService {
    constructor(rolesRepository) {
        this.rolesRepository = rolesRepository;
    }

    async create(createRoleDto) {
        const existingRole = await this.rolesRepository.findByName(createRoleDto.name);
        if (existingRole) {
            throw new ConflictException(AppMessages.Errors.General.RESOURCE_ALREADY_EXISTS);
        }
        return this.rolesRepository.create({
            roleName: createRoleDto.name,
            description: createRoleDto.description,
            status: createRoleDto.status || 'active'
        });

        // Log action
        // Note: Actual action logging would typically be handled via an event bus or direct repository call if available
        // For now, assuming ActionLogEntity creation logic would go here or be handled by an interceptor
        // Since we don't have a direct ActionLogService injected here yet, we'll stick to core logic

        return newRole;
    }

    async findAll() {
        return this.rolesRepository.findAll();
    }

    async findById(id) {
        const role = await this.rolesRepository.findById(id);
        if (!role) {
            throw new NotFoundException(AppMessages.Errors.General.NOT_FOUND);
        }
        return role;
    }

    async update(id, updateRoleDto) {
        const role = await this.findById(id);

        if (updateRoleDto.name) {
            // Check if name is taken by another role
            const existingRole = await this.rolesRepository.findByNameExcludeId(updateRoleDto.name, id);
            if (existingRole) {
                throw new ConflictException(AppMessages.Errors.General.RESOURCE_ALREADY_EXISTS);
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
            throw new ConflictException('Cannot delete system roles');
        }

        const isInUse = await this.rolesRepository.isRoleInUse(id);
        if (isInUse) {
            throw new ConflictException('Role is currently assigned to users and cannot be deleted');
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
