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
    const { skip, limit, sortBy, sortOrder, search, statuses, roles } =
      paginationDto;

    const order = {};
    if (sortBy) {
      order[sortBy] = sortOrder;
    } else {
      order.createdAt = 'DESC';
    }

    let query = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.userRoles', 'userRoles')
      .leftJoinAndSelect('userRoles.role', 'role')
      .where('user.is_deleted != 1'); // Exclude deleted users

    // Add search filter if provided
    if (search) {
      query = query.andWhere(
        '(user.username LIKE :search OR user.email LIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Add status filter if provided
    if (statuses) {
      query.andWhere('user.status = :statuses', { statuses });
    }

    // Add role filter if provided
    if (roles) {
      query = query.andWhere('role.id = :roleId', { roleId: roles });
    }

    query = query
      .distinct(true)
      .addSelect(
        `CASE WHEN LOWER(role.roleName) = LOWER(:adminRole) THEN 1 ELSE 0 END`,
        'is_admin',
      )
      .setParameter('adminRole', 'admin')
      .orderBy('is_admin', 'DESC');

    if (
      sortBy === 'id' ||
      sortBy === 'username' ||
      sortBy === 'email' ||
      sortBy === 'status'
    ) {
      query = query.addOrderBy(`user.${sortBy}`, sortOrder || 'ASC');
    } else {
      query = query.addOrderBy(
        `user.${sortBy || 'createdAt'}`,
        sortOrder || 'DESC',
      );
    }

    return query.skip(skip).take(limit).getManyAndCount();
  }

  async findById(id) {
    return this.userRepository.findOne({
      where: { id },
      relations: [
        'userRoles',
        'userRoles.role',
        'userRoles.role.rolePermissions',
        'userRoles.role.rolePermissions.permission',
      ],
    });
  }

  async findByIdWithPassword(id) {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .leftJoinAndSelect('user.userRoles', 'userRoles')
      .leftJoinAndSelect('userRoles.role', 'role')
      .leftJoinAndSelect('role.rolePermissions', 'rolePermissions')
      .leftJoinAndSelect('rolePermissions.permission', 'permission')
      .where('user.id = :id', { id })
      .getOne();
  }

  async findByEmail(email) {
    return this.userRepository.findOne({
      where: { email: email.toLowerCase() },
      relations: [
        'userRoles',
        'userRoles.role',
        'userRoles.role.rolePermissions',
        'userRoles.role.rolePermissions.permission',
      ],
    });
  }

  async findByEmailWithPasswordBuilder(email) {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .leftJoinAndSelect('user.userRoles', 'userRoles')
      .leftJoinAndSelect('userRoles.role', 'role')
      .leftJoinAndSelect('role.rolePermissions', 'rolePermissions')
      .leftJoinAndSelect('rolePermissions.permission', 'permission')
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
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new Error('User not found');
    }

    Object.assign(user, data);

    return await this.userRepository.save(user);
  }

  async delete(id) {
    await this.userRepository
      .createQueryBuilder()
      .update(UserEntity)
      .set({
        deletedAt: new Date(),
        isDeleted: true,
        status: 'DELETED',
        refreshToken: null,
        refreshTokenExpireAt: null,
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

  async lockUser(id) {
    await this.userRepository.update(id, {
      status: 'LOCKED',
      refreshToken: null,
      refreshTokenExpireAt: null,
    });
  }

  async unlockUser(id) {
    await this.userRepository.update(id, { status: 'ACTIVE' });
  }

  async findByIdAndRoles(id) {
    return this.userRepository.findOne({
      where: { id },
      relations: ['userRoles', 'userRoles.role'],
    });
  }

  async countActiveAdmins() {
    return this.userRepository
      .createQueryBuilder('user')
      .innerJoin('user.userRoles', 'userRoles')
      .innerJoin('userRoles.role', 'role')
      .where('user.status = :status', { status: 'ACTIVE' })
      .andWhere('role.name = :roleName', { roleName: 'ADMIN' })
      .distinct(true)
      .getCount();
  }
}
