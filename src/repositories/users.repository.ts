import { AppDataSource } from '../database/data-source';
import { UserEntity } from '../models/entities/user.entity';
import { PaginationDto } from '../common/dto';
import { FindOptionsWhere } from 'typeorm';

export class UsersRepository {
    private userRepository = AppDataSource.getRepository(UserEntity);

    async create(data: Partial<UserEntity>): Promise<UserEntity> {
        const user = this.userRepository.create(data);
        return this.userRepository.save(user);
    }

    async findAll(paginationDto: PaginationDto): Promise<[UserEntity[], number]> {
        const { skip, limit, sortBy, sortOrder } = paginationDto;

        const order: any = {};
        if (sortBy) {
            order[sortBy] = sortOrder;
        } else {
            order.createdAt = 'DESC';
        }

        return this.userRepository.findAndCount({
            where: {}, // Add search logic here if needed
            relations: ['userRoles', 'userRoles.role'],
            order,
            skip,
            take: limit,
        });
    }

    async findById(id: number): Promise<UserEntity | null> {
        return this.userRepository.findOne({
            where: { id },
            relations: ['userRoles', 'userRoles.role']
        });
    }

    async findByIdWithPassword(id: number): Promise<UserEntity | null> {
        return this.userRepository.createQueryBuilder('user')
            .addSelect('user.password')
            .leftJoinAndSelect('user.userRoles', 'userRoles')
            .leftJoinAndSelect('userRoles.role', 'role')
            .where('user.id = :id', { id })
            .getOne();
    }

    async findByEmail(email: string): Promise<UserEntity | null> {
        return this.userRepository.findOne({
            where: { email: email.toLowerCase() },
            relations: ['userRoles', 'userRoles.role']
        });
    }

    async findByEmailWithPasswordBuilder(email: string): Promise<UserEntity | null> {
        return this.userRepository.createQueryBuilder('user')
            .addSelect('user.password')
            .leftJoinAndSelect('user.userRoles', 'userRoles')
            .leftJoinAndSelect('userRoles.role', 'role')
            .where('user.email = :email', { email: email.toLowerCase() })
            .getOne();
    }

    async findOne(
        where: FindOptionsWhere<UserEntity>,
    ): Promise<UserEntity | null> {
        return this.userRepository.findOne({
            where,
            relations: ['userRoles', 'userRoles.role']
        });
    }

    async update(id: number, data: Partial<UserEntity>): Promise<UserEntity> {
        await this.userRepository.update(id, data);
        const updated = await this.findById(id);
        if (!updated) {
            throw new Error('User not found');
        }
        return updated;
    }

    async delete(id: number): Promise<void> {
        await this.userRepository
            .createQueryBuilder()
            .update(UserEntity)
            .set({
                deletedAt: new Date(),
                isDeleted: true
            })
            .where('id = :id', { id })
            .execute();
    }

    async updateRefreshToken(
        id: number,
        refreshToken: string | null,
    ): Promise<void> {
        await this.userRepository.update(id, {
            refreshToken: refreshToken ?? undefined
        });
    }

    async updateLastLogin(id: number): Promise<void> {
        await this.userRepository.update(id, { lastLoginTime: new Date() });
    }
}
