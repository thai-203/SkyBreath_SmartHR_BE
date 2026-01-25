import { RolesRepository } from '../repositories/roles.repository';
import { CreateRoleDto, UpdateRoleDto } from '../models/dto/roles';
import { RoleEntity } from '../models/entities/role.entity';
import { ConflictException } from '../common/exceptions/conflict.exception';
import { NotFoundException } from '../common/exceptions/not-found.exception';
import { AppMessages } from '../common/constants';

export class RolesService {
    constructor(private readonly rolesRepository: RolesRepository) { }

    async create(createRoleDto: CreateRoleDto): Promise<RoleEntity> {
        const existingRole = await this.rolesRepository.findByName(createRoleDto.name);
        if (existingRole) {
            throw new ConflictException(AppMessages.Errors.General.RESOURCE_ALREADY_EXISTS);
        }
        return this.rolesRepository.create({
            roleName: createRoleDto.name,
            description: createRoleDto.description,
        });
    }

    async findAll(): Promise<RoleEntity[]> {
        return this.rolesRepository.findAll();
    }

    async findById(id: number): Promise<RoleEntity> {
        const role = await this.rolesRepository.findById(id);
        if (!role) {
            throw new NotFoundException(AppMessages.Errors.General.NOT_FOUND);
        }
        return role;
    }

    async update(id: number, updateRoleDto: UpdateRoleDto): Promise<RoleEntity> {
        const updateData: Partial<RoleEntity> = {};
        if (updateRoleDto.name) updateData.roleName = updateRoleDto.name;
        if (updateRoleDto.description) updateData.description = updateRoleDto.description;

        return this.rolesRepository.update(id, updateData);
    }

    async remove(id: number): Promise<void> {
        await this.findById(id);
        await this.rolesRepository.delete(id);
    }
}
