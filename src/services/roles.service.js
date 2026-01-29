import { ConflictException } from '../common/exceptions/conflict.exception.js';
import { NotFoundException } from '../common/exceptions/not-found.exception.js';
import { AppMessages } from '../common/constants/index.js';

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
        });
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
        const updateData = {};
        if (updateRoleDto.name) updateData.roleName = updateRoleDto.name;
        if (updateRoleDto.description) updateData.description = updateRoleDto.description;

        return this.rolesRepository.update(id, updateData);
    }

    async remove(id) {
        await this.findById(id);
        await this.rolesRepository.delete(id);
    }
}
