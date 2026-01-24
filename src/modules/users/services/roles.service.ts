import {
    Injectable,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { RolesRepository } from '../repositories';
import { CreateRoleDto, UpdateRoleDto } from '../dto/role';
import { RoleEntity } from '../entities';
import { ErrorCodes } from '../../../common/constants';

@Injectable()
export class RolesService {
    constructor(private readonly rolesRepository: RolesRepository) { }

    async create(createRoleDto: CreateRoleDto): Promise<RoleEntity> {
        const existingRole = await this.rolesRepository.findByName(
            createRoleDto.name,
        );

        if (existingRole) {
            throw new ConflictException({
                message: 'Role already exists',
                errorCode: 'ROLE_ALREADY_EXISTS',
            });
        }

        return this.rolesRepository.create(createRoleDto);
    }

    async findAll(): Promise<RoleEntity[]> {
        return this.rolesRepository.findAll();
    }

    async findById(id: string): Promise<RoleEntity> {
        const role = await this.rolesRepository.findById(id);
        if (!role) {
            throw new NotFoundException({
                message: 'Role not found',
                errorCode: 'ROLE_NOT_FOUND',
            });
        }
        return role;
    }

    async update(id: string, updateRoleDto: UpdateRoleDto): Promise<RoleEntity> {
        await this.findById(id);

        if (updateRoleDto.name) {
            const existingRole = await this.rolesRepository.findByName(
                updateRoleDto.name,
            );
            if (existingRole && existingRole.id !== id) {
                throw new ConflictException({
                    message: 'Role name already exists',
                    errorCode: 'ROLE_ALREADY_EXISTS',
                });
            }
        }

        return this.rolesRepository.update(id, updateRoleDto);
    }

    async remove(id: string): Promise<void> {
        await this.findById(id);
        await this.rolesRepository.delete(id);
    }
}
