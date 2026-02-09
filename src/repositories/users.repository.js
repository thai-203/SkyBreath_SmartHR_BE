import ms from 'ms';
import { AppDataSource } from '../database/data-source.js';
import { UserEntity } from '../models/entities/user.entity.js';
import { hashRefreshToken } from '../common/utils/hash.util.js';

export class UsersRepository {
  constructor() {
    this.userRepository = AppDataSource.getRepository(UserEntity);
  }

  async create(data) {
    const user = this.userRepository.create(data);
    return this.userRepository.save(user);
  }

  async findAll(paginationDto) {
    const { skip, limit, sortBy, sortOrder } = paginationDto;

    const order = {};
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

  async findById(id) {
    return this.userRepository.findOne({
      where: { id },
      relations: ['userRoles', 'userRoles.role'],
    });
  }

  async findByIdWithPassword(id) {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .leftJoinAndSelect('user.userRoles', 'userRoles')
      .leftJoinAndSelect('userRoles.role', 'role')
      .where('user.id = :id', { id })
      .getOne();
  }

  async findByEmail(email) {
    return this.userRepository.findOne({
      where: { email: email.toLowerCase() },
      relations: ['userRoles', 'userRoles.role'],
    });
  }

  async findByEmailWithPasswordBuilder(email) {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .leftJoinAndSelect('user.userRoles', 'userRoles')
      .leftJoinAndSelect('userRoles.role', 'role')
      .where('user.email = :email', { email: email.toLowerCase() })
      .getOne();
  }

  async findOne(where) {
    return this.userRepository.findOne({
      where,
      relations: ['userRoles', 'userRoles.role'],
    });
  }

  async update(id, data) {
    await this.userRepository.update(id, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('User not found');
    }
    return updated;
  }

  async delete(id) {
    await this.userRepository
      .createQueryBuilder()
      .update(UserEntity)
      .set({
        deletedAt: new Date(),
        isDeleted: true,
      })
      .where('id = :id', { id })
      .execute();
  }

  async updateRefreshToken(id, refreshToken) {
    await this.userRepository.update(id, {
      refreshToken: refreshToken ? hashRefreshToken(refreshToken) : null,
      refreshTokenExpireAt: refreshToken
        ? new Date(Date.now() + ms(process.env.JWT_REFRESH_EXPIRES_IN || '7d'))
        : null,
    });
  }

  async updateLastLogin(id) {
    await this.userRepository.update(id, { lastLoginTime: new Date() });
  }
}
