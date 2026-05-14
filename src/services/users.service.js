import { UsersRepository } from '../repositories/users.repository.js';
import { RolesRepository } from '../repositories/roles.repository.js';
import { hashPassword, hashResetPasswordToken } from '../common/utils/index.js';
import { AppMessages } from '../common/constants/index.js';
import { PaginatedResponseDto } from '../common/dto/index.js';
import {
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '../common/exceptions/index.js';
import { RoleEntity } from '../models/entities/role.entity.js';
import { AppDataSource } from '../database/data-source.js';
import { UserRoleRepository } from '../repositories/user-role.repository.js';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { MailService } from './mail.service.js';
import { config } from '../config/env.config.js';
import { isEmail, matches } from 'class-validator';
export class UsersService {
  constructor(
    usersRepository = new UsersRepository(),
    rolesRepository = new RolesRepository(),
    userRoleRepository = new UserRoleRepository(),
    mailServiceInstance = new MailService(),
  ) {
    this.usersRepository = usersRepository;
    this.rolesRepository = rolesRepository;
    this.userRoleRepository = userRoleRepository;
    this.mailService = mailServiceInstance;
  }

  async create(createUserDto) {
    const { email, username, password, roleIds, status } = createUserDto;

    if (!email) {
      throw new BadRequestException(AppMessages.Errors.Auth.EMAIL_REQUIRED);
    }
    if (!isEmail(email)) {
      throw new BadRequestException(AppMessages.Errors.Auth.INVALID_EMAIL);
    }

    if (!username) {
      throw new BadRequestException('Tên đăng nhập không được để trống');
    }
    if (username.length > 50) {
      throw new BadRequestException(
        'Tên đăng nhập không được vượt quá 50 ký tự',
      );
    }

    if (!password) {
      throw new BadRequestException(AppMessages.Errors.Auth.PASSWORD_REQUIRED);
    }
    if (
      !matches(password, /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/) ||
      password.length < 8 ||
      password.length > 50
    ) {
      throw new BadRequestException(AppMessages.Errors.Auth.INVALID_PASSWORD);
    }

    if (roleIds !== undefined && !Array.isArray(roleIds)) {
      throw new BadRequestException('Danh sách vai trò không hợp lệ');
    }

    if (status && status.length > 20) {
      throw new BadRequestException('Trạng thái không hợp lệ');
    }

    // Check if email already exists
    const existingUserByEmail = await this.usersRepository.findByEmail(
      createUserDto.email,
    );
    if (existingUserByEmail) {
      throw new ConflictException(AppMessages.Errors.User.EMAIL_ALREADY_EXISTS);
    }

    // Check if username already exists
    const existingUserByUsername = await this.usersRepository.findOne({
      username: createUserDto.username,
      isDeleted: false,
    });
    if (existingUserByUsername) {
      throw new ConflictException(
        AppMessages.Errors.User.USERNAME_ALREADY_EXISTS,
      );
    }

    // Validate roles exist if provided
    let roles = [];
    if (createUserDto.roleIds?.length) {
      roles = await this.rolesRepository.findByIds(createUserDto.roleIds);
      for (const role of roles) {
        if (role.roleName === 'ADMIN') {
          throw new ForbiddenException(
            AppMessages.Errors.User.ROLE_ASIGN_FORBIDDEN,
          );
        }
      }
      if (roles.length !== createUserDto.roleIds.length) {
        throw new NotFoundException(AppMessages.Errors.User.NOT_FOUND);
      }
    }

    const hashedPassword = await hashPassword(createUserDto.password);

    const user = await this.usersRepository.create({
      email: createUserDto.email,
      username: createUserDto.username,
      password: hashedPassword,
      status: createUserDto.status || 'ACTIVE',
    });

    if (roles.length > 0) {
      const userRoles = roles.map((role) => ({
        userId: user.id,
        roleId: role,
      }));

      await this.userRoleRepository.bulkCreate(userRoles);
    }
    // TODO: Handle role assignment via UserRoleEntity if roleIds provided

    return user;
  }

  async findAll(paginationDto, currentUserId) {
    const [users, total] = await this.usersRepository.findAll(paginationDto);
    const result = users.map((u) => ({
      ...u,
      isCurrentUser: u.id === currentUserId,
    }));
    return new PaginatedResponseDto(result, total, paginationDto);
  }

  async getMetadata() {
    const roleRepository = AppDataSource.getRepository(RoleEntity);

    const roles = await roleRepository.find({
      where: { isDeleted: false },
      order: { roleName: 'ASC' },
    });

    const statusOptions = [
      { value: 'ACTIVE', label: 'Hoạt động' },
      { value: 'INACTIVE', label: 'Ngưng hoạt động' },
      { value: 'LOCKED', label: 'Đã khóa' },
    ];

    const passwordPolicy = {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumber: true,
      requireSpecialChar: true,
    };

    return {
      roles,
      statusOptions,
      passwordPolicy,
    };
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
    const { roleIds, ...userData } = updateUserDto;
    const { email, username, status } = userData;

    if (email && !isEmail(email)) {
      throw new BadRequestException(AppMessages.Errors.Auth.INVALID_EMAIL);
    }

    if (username && username.length > 50) {
      throw new BadRequestException(
        'Tên đăng nhập không được vượt quá 50 ký tự',
      );
    }

    if (roleIds !== undefined && !Array.isArray(roleIds)) {
      throw new BadRequestException('Danh sách vai trò không hợp lệ');
    }

    if (status && status.length > 20) {
      throw new BadRequestException('Trạng thái không hợp lệ');
    }

    const user = await this.findById(id);

    // Check email uniqueness if email is being updated
    if (email && email !== user.email) {
      const existingUser = await this.usersRepository.findByEmail(email);
      if (existingUser) {
        throw new ConflictException(
          AppMessages.Errors.User.EMAIL_ALREADY_EXISTS,
        );
      }
    }

    // Check username uniqueness if username is being updated
    if (username && username !== user.username) {
      const existingUser = await this.usersRepository.findOne({
        username: username,
      });
      if (existingUser) {
        throw new ConflictException(
          AppMessages.Errors.User.USERNAME_ALREADY_EXISTS,
        );
      }
    }

    // Validate roles exist if provided
    if (roleIds && roleIds.length > 0) {
      for (const roleId of roleIds) {
        const role = await this.rolesRepository.findById(roleId);
        if (!role) {
          throw new NotFoundException(AppMessages.Errors.User.ROLE_NOT_FOUND);
        }
        if (role.roleName === 'ADMIN') {
          throw new ForbiddenException(
            AppMessages.Errors.User.ROLE_ASIGN_FORBIDDEN,
          );
        }
      }
    }

    await this.usersRepository.update(id, userData);

    if (roleIds) {
      await this.userRoleRepository.deleteByUserId(id);
      const userRoles = roleIds.map((roleId) => ({
        userId: id,
        roleId,
      }));
      await this.userRoleRepository.bulkCreate(userRoles);
    }
    return user;
  }

  async remove(id, currentUserId) {
    const user = await this.findById(id);

    // Cannot delete self
    if (id === currentUserId) {
      throw new ForbiddenException('Không thể xóa tài khoản của chính bạn');
    }

    // Check if user is the last system admin
    const userRoles = user.userRoles || [];
    const isAdmin = userRoles.some((ur) => ur.role.roleName === 'ADMIN');

    if (isAdmin) {
      const activeAdminCount = await this.usersRepository.countActiveAdmins();
      if (activeAdminCount <= 1) {
        throw new ForbiddenException(
          'Không thể xóa người quản trị hệ thống cuối cùng',
        );
      }
    }

    // Soft delete - update status to DELETED
    await this.usersRepository.delete(id);
  }

  async lockUser(id, currentUserId) {
    const user = await this.findById(id);

    if (id === currentUserId) {
      throw new ForbiddenException('Không thể khóa tài khoản của chính bạn');
    }

    const userRoles = user.userRoles || [];
    const isAdmin = userRoles.some((ur) => ur.role.roleName === 'ADMIN');

    if (isAdmin) {
      const activeAdminCount = await this.usersRepository.countActiveAdmins();
      if (activeAdminCount <= 1) {
        throw new ForbiddenException(
          'Không thể khóa người quản trị hệ thống cuối cùng',
        );
      }
    }

    if (user.status === 'LOCKED') {
      throw new BadRequestException('Tài khoản đã bị khóa');
    }

    await this.usersRepository.lockUser(id);
  }

  async unlockUser(id) {
    const user = await this.findById(id);

    if (user.status === 'ACTIVE') {
      throw new BadRequestException('Người dùng đã ở trạng thái hoạt động');
    }

    if (user.status === 'DELETED') {
      throw new BadRequestException('Không thể mở khóa tài khoản đã bị xóa');
    }

    await this.usersRepository.unlockUser(id);
  }

  async updateRefreshToken(id, refreshToken) {
    await this.usersRepository.updateRefreshToken(id, refreshToken);
  }

  async updateLastLogin(id) {
    await this.usersRepository.updateLastLogin(id);
  }

  async removeUserRoles(userId, currentUserId) {
    const user = await this.findById(userId);

    if (userId === currentUserId) {
      throw new ForbiddenException('Không thể xóa vai trò của chính bạn');
    }

    if (!user) {
      throw new NotFoundException(AppMessages.Errors.User.NOT_FOUND);
    }
    const userRoles = user.userRoles || [];
    const isAdmin = userRoles.some((ur) => ur.role.roleName === 'ADMIN');

    if (isAdmin) {
      const activeAdminCount = await this.usersRepository.countActiveAdmins();
      if (activeAdminCount <= 1) {
        throw new ForbiddenException(
          'Không thể xóa vai trò của người quản trị hệ thống cuối cùng',
        );
      }
    }
    if (userRoles.length === 0) {
      throw new BadRequestException('Người dùng không có vai trò nào để xóa');
    }
    await this.userRoleRepository.deleteByUserId(userId);
  }

  async resetPassword(userId, currentUserId) {
    const user = await this.findById(userId);

    if (userId === currentUserId) {
      throw new ForbiddenException('Không thể đặt lại mật khẩu của chính bạn');
    }

    if (!user) {
      throw new NotFoundException(AppMessages.Errors.User.NOT_FOUND);
    }

    const userRoles = user.userRoles || [];
    const isAdmin = userRoles.some((ur) => ur.role.roleName === 'ADMIN');

    if (isAdmin) {
      const activeAdminCount = await this.usersRepository.countActiveAdmins();
      if (activeAdminCount <= 1) {
        throw new ForbiddenException(
          'Không thể đặt lại mật khẩu của người quản trị hệ thống cuối cùng',
        );
      }
    }

    // Generate OTP (6 digits) and otpRequestId (UUID)
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpRequestId = uuidv4();

    // Hash OTP for storage
    const hashedOtp = hashResetPasswordToken(otp);

    // Save OTP and set mustChangePassword flag
    await this.usersRepository.update(userId, {
      otp: hashedOtp,
      otpRequestId,
      mustChangePassword: true,
    });

    // Create reset URL with otpRequestId and OTP
    const resetUrl = `${config.frontEndUrl}/forgot-password?requestId=${otpRequestId}&otp=${otp}`;

    // Send email
    await this.mailService.AdminResetPasswordEmail(
      user.email,
      user.username,
      resetUrl,
    );

    return {
      message: 'OTP đã được gửi đến email của nhân viên',
      otpRequestId,
    };
  }
}
