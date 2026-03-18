import { AppDataSource } from '../database/data-source.js';
import { UserRoleEntity } from '../models/entities/user-role.entity.js';

export class UserRoleRepository {
  constructor() {
    this.userRoleRepository = AppDataSource.getRepository(UserRoleEntity);
  }

  // Tạo 1 record user-role
  async create(data) {
    const entity = this.userRoleRepository.create(data);
    return this.userRoleRepository.save(entity);
  }

  // Bulk insert nhiều role cho 1 user
  async bulkCreate(dataArray) {
    const entities = this.userRoleRepository.create(dataArray);
    return this.userRoleRepository.save(entities);
  }

  // Lấy tất cả role theo userId
  async findByUserId(userId) {
    return this.userRoleRepository.find({
      where: { userId },
      relations: ['role'],
    });
  }

  // Xóa toàn bộ role của user
  async deleteByUserId(userId) {
    return this.userRoleRepository.delete({ userId });
  }

  // Xóa 1 role cụ thể của user
  async deleteByUserIdAndRoleId(userId, roleId) {
    return this.userRoleRepository.delete({ userId, roleId });
  }

  // Replace toàn bộ role của user (dùng khi update)
  async replaceUserRoles(userId, roleIds) {
    // Xóa role cũ
    await this.deleteByUserId(userId);

    // Insert role mới
    if (roleIds && roleIds.length > 0) {
      const newRoles = roleIds.map((roleId) => ({
        userId,
        roleId,
      }));

      await this.bulkCreate(newRoles);
    }
  }
}
