import { UsersRepository } from '../repositories/users.repository';
import { RolesRepository } from '../repositories/roles.repository';
import { CreateUserDto, UpdateUserDto } from '../models/dto/users';
import { UserEntity } from '../models/entities/user.entity';
import { hashPassword } from '../common/utils';
import { AppMessages } from '../common/constants';
import { PaginationDto, PaginatedResponseDto } from '../common/dto';
import { ConflictException, NotFoundException } from '../common/exceptions';

export class UsersService {
    private usersRepository: UsersRepository;
    private rolesRepository: RolesRepository;

    constructor() {
        this.usersRepository = new UsersRepository();
        this.rolesRepository = new RolesRepository();
    }

    async create(createUserDto: CreateUserDto): Promise<UserEntity> {
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

    async findAll(paginationDto: PaginationDto): Promise<PaginatedResponseDto<UserEntity>> {
        const [users, total] = await this.usersRepository.findAll(paginationDto);
        return new PaginatedResponseDto(users, total, paginationDto);
    }

    async findById(id: number): Promise<UserEntity> {
        const user = await this.usersRepository.findById(id);
        if (!user) {
            throw new NotFoundException(AppMessages.Errors.User.NOT_FOUND);
        }
        return user;
    }

    async findByEmail(email: string): Promise<UserEntity | null> {
        return this.usersRepository.findByEmail(email);
    }

    async findByEmailWithPassword(email: string): Promise<UserEntity | null> {
        return this.usersRepository.findByEmailWithPasswordBuilder(email);
    }

    async findByIdWithPassword(id: number): Promise<UserEntity | null> {
        return this.usersRepository.findByIdWithPassword(id);
    }

    async update(id: number, updateUserDto: UpdateUserDto): Promise<UserEntity> {
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

    async remove(id: number): Promise<void> {
        await this.findById(id);
        await this.usersRepository.delete(id);
    }

    async updateRefreshToken(
        id: number,
        refreshToken: string | null,
    ): Promise<void> {
        await this.usersRepository.updateRefreshToken(id, refreshToken);
    }

    async updateLastLogin(id: number): Promise<void> {
        await this.usersRepository.updateLastLogin(id);
    }
}
