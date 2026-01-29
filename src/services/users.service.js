import { UsersRepository } from '../repositories/users.repository.js';
import { RolesRepository } from '../repositories/roles.repository.js';
import { hashPassword } from '../common/utils/index.js';
import { AppMessages } from '../common/constants/index.js';
import { PaginatedResponseDto } from '../common/dto/index.js';
import { ConflictException, NotFoundException } from '../common/exceptions/index.js';

export class UsersService {
    constructor() {
        this.usersRepository = new UsersRepository();
        this.rolesRepository = new RolesRepository();
    }

    async create(createUserDto) {
        const existingUser = await this.usersRepository.findByEmail(
            createUserDto.email,
        );

        if (existingUser) {
            throw new ConflictException(AppMessages.Errors.User.ALREADY_EXISTS);
        }

        const hashedPassword = await hashPassword(createUserDto.password);

        // Note: Role assignment needs to be handled via UserRoleEntity

        const user = await this.usersRepository.create({
            email: createUserDto.email,
            username: createUserDto.email, // Default username
            password: hashedPassword,
            status: 'ACTIVE',
        });

        // TODO: Handle role assignment

        return user;
    }

    async findAll(paginationDto) {
        const [users, total] = await this.usersRepository.findAll(paginationDto);
        return new PaginatedResponseDto(users, total, paginationDto);
    }

    async findById(id) {
        const user = await this.usersRepository.findById(id);
        if (!user) {
            throw new NotFoundException(AppMessages.Errors.User.NOT_FOUND);
        }
        return user;
    }

    async findByEmail(email) {
        return this.usersRepository.findByEmail(email);
    }

    async findByEmailWithPassword(email) {
        return this.usersRepository.findByEmailWithPasswordBuilder(email);
    }

    async findByIdWithPassword(id) {
        return this.usersRepository.findByIdWithPassword(id);
    }

    async update(id, updateUserDto) {
        const user = await this.findById(id);

        if (updateUserDto.email && updateUserDto.email !== user.email) {
            const existingUser = await this.usersRepository.findByEmail(
                updateUserDto.email,
            );
            if (existingUser) {
                throw new ConflictException(AppMessages.Errors.User.ALREADY_EXISTS);
            }
        }

        // TODO: Handle role updates via UserRoleEntity

        return this.usersRepository.update(id, updateUserDto);
    }

    async remove(id) {
        await this.findById(id);
        await this.usersRepository.delete(id);
    }

    async updateRefreshToken(id, refreshToken) {
        await this.usersRepository.updateRefreshToken(id, refreshToken);
    }

    async updateLastLogin(id) {
        await this.usersRepository.updateLastLogin(id);
    }
}
