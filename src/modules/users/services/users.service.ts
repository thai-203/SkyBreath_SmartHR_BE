import {
    Injectable,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { UsersRepository } from '../repositories';
import { RolesRepository } from '../repositories';
import { CreateUserDto, UpdateUserDto } from '../dto/user';
import { UserEntity, RoleEntity } from '../entities';
import { hashPassword } from '../../../common/utils';
import { ErrorCodes } from '../../../common/constants';
import { PaginationDto, PaginatedResponseDto } from '../../../common/dto';

@Injectable()
export class UsersService {
    constructor(
        private readonly usersRepository: UsersRepository,
        private readonly rolesRepository: RolesRepository,
    ) { }

    async create(createUserDto: CreateUserDto): Promise<UserEntity> {
        const existingUser = await this.usersRepository.findByEmail(
            createUserDto.email,
        );

        if (existingUser) {
            throw new ConflictException({
                message: 'Email already exists',
                errorCode: ErrorCodes.USER_ALREADY_EXISTS,
            });
        }

        const hashedPassword = await hashPassword(createUserDto.password);

        let roles: RoleEntity[] = [];
        if (createUserDto.roleIds && createUserDto.roleIds.length > 0) {
            roles = await this.rolesRepository.findByIds(createUserDto.roleIds);
        }

        const user = await this.usersRepository.create({
            email: createUserDto.email,
            password: hashedPassword,
            firstName: createUserDto.firstName,
            lastName: createUserDto.lastName,
            roles,
        });

        return user;
    }

    async findAll(paginationDto: PaginationDto): Promise<PaginatedResponseDto<UserEntity>> {
        const [users, total] = await this.usersRepository.findAll(paginationDto);
        return new PaginatedResponseDto(users, total, paginationDto);
    }

    async findById(id: string): Promise<UserEntity> {
        const user = await this.usersRepository.findById(id);
        if (!user) {
            throw new NotFoundException({
                message: 'User not found',
                errorCode: ErrorCodes.USER_NOT_FOUND,
            });
        }
        return user;
    }

    async findByEmail(email: string): Promise<UserEntity | null> {
        return this.usersRepository.findByEmail(email);
    }

    async update(id: string, updateUserDto: UpdateUserDto): Promise<UserEntity> {
        const user = await this.findById(id);

        if (updateUserDto.email && updateUserDto.email !== user.email) {
            const existingUser = await this.usersRepository.findByEmail(
                updateUserDto.email,
            );
            if (existingUser) {
                throw new ConflictException({
                    message: 'Email already exists',
                    errorCode: ErrorCodes.USER_ALREADY_EXISTS,
                });
            }
        }

        if (updateUserDto.roleIds) {
            const roles = await this.rolesRepository.findByIds(updateUserDto.roleIds);
            Object.assign(user, { ...updateUserDto, roles });
            return this.usersRepository.create(user);
        }

        return this.usersRepository.update(id, updateUserDto);
    }

    async remove(id: string): Promise<void> {
        await this.findById(id);
        await this.usersRepository.delete(id);
    }

    async updateRefreshToken(
        id: string,
        refreshToken: string | null,
    ): Promise<void> {
        await this.usersRepository.updateRefreshToken(id, refreshToken);
    }

    async updateLastLogin(id: string): Promise<void> {
        await this.usersRepository.updateLastLogin(id);
    }
}
