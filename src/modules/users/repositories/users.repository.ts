import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { UserEntity } from '../entities';
import { PaginationDto } from '../../../common/dto';

@Injectable()
export class UsersRepository {
    constructor(
        @InjectRepository(UserEntity)
        private readonly userRepository: Repository<UserEntity>,
    ) { }

    async create(data: Partial<UserEntity>): Promise<UserEntity> {
        const user = this.userRepository.create(data);
        return this.userRepository.save(user);
    }

    async findAll(paginationDto: PaginationDto): Promise<[UserEntity[], number]> {
        const { skip, limit, sortBy, sortOrder } = paginationDto;

        const queryBuilder = this.userRepository.createQueryBuilder('user');

        queryBuilder
            .leftJoinAndSelect('user.roles', 'roles')
            .skip(skip)
            .take(limit);

        if (sortBy) {
            queryBuilder.orderBy(`user.${sortBy}`, sortOrder);
        } else {
            queryBuilder.orderBy('user.createdAt', 'DESC');
        }

        return queryBuilder.getManyAndCount();
    }

    async findById(id: string): Promise<UserEntity | null> {
        return this.userRepository.findOne({ where: { id } });
    }

    async findByEmail(email: string): Promise<UserEntity | null> {
        return this.userRepository.findOne({
            where: { email: email.toLowerCase() },
        });
    }

    async findOne(
        where: FindOptionsWhere<UserEntity>,
    ): Promise<UserEntity | null> {
        return this.userRepository.findOne({ where });
    }

    async update(id: string, data: Partial<UserEntity>): Promise<UserEntity> {
        await this.userRepository.update(id, data);
        const updated = await this.findById(id);
        if (!updated) {
            throw new Error('User not found');
        }
        return updated;
    }

    async delete(id: string): Promise<void> {
        await this.userRepository.softDelete(id);
    }

    async updateRefreshToken(
        id: string,
        refreshToken: string | null,
    ): Promise<void> {
        await this.userRepository.update(id, {
            refreshToken: refreshToken ?? undefined
        });
    }

    async updateLastLogin(id: string): Promise<void> {
        await this.userRepository.update(id, { lastLoginAt: new Date() });
    }
}
