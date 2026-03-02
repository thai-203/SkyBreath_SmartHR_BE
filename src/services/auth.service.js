import * as jwt from 'jsonwebtoken';
import { UsersService } from './users.service.js';
import { AppDataSource } from '../database/data-source.js';
import { EmployeeEntity } from '../models/entities/employee.entity.js';
import { EmployeesRepository } from '../repositories/employees.repository.js';
import { ActionLogsRepository } from '../repositories/action-logs.repository.js';
import {
  hashPassword,
  comparePassword,
  hashResetPasswordToken,
  compareRefreshToken,
} from '../common/utils/index.js';
import { AppMessages } from '../common/constants/index.js';
import {
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '../common/exceptions/index.js';
import crypto from 'crypto';
import { RedisService } from './redis.service.js';
import { MailService } from './mail.service.js';
import { config } from '../config/env.config.js';
export class AuthService {
  constructor(
    usersService = new UsersService(),
    cacheService = new RedisService(),
    mailServiceInstance = new MailService(),
  ) {
    this.usersService = usersService;
    this.cacheService = cacheService;
    this.mailService = mailServiceInstance;
  }

  async validateUser(email, password) {
    const user = await this.usersService.findByEmailWithPassword(email);

    if (!user) {
      return null;
    }

    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    if (user.status !== 'ACTIVE' || user.isDeleted) {
      throw new UnauthorizedException(AppMessages.Errors.User.INACTIVE);
    }

    return user;
  }

  async login(user) {
    const tokens = await this.generateTokens(user);

    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);
    await this.usersService.updateLastLogin(user.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        roles: user.userRoles?.map((ur) => ur.role.roleName) || [],
      },
      ...tokens,
    };
  }

  async refreshTokens(userId, refreshToken) {
    const user = await this.usersService.findById(userId);

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Access denied');
    }

    if (!compareRefreshToken(user.refreshToken, refreshToken)) {
      throw new UnauthorizedException('Access denied');
    }

    const tokens = await this.generateTokens(user);
    await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId) {
    await this.usersService.updateRefreshToken(userId, null);
    return { message: 'Logged out successfully' };
  }

  async changePassword(userId, changePasswordDto) {
    const user = await this.usersService.findByIdWithPassword(userId);

    if (!user) {
      throw new NotFoundException(AppMessages.Errors.User.NOT_FOUND);
    }

    const isPasswordValid = await comparePassword(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new BadRequestException(AppMessages.Errors.User.INVALID_PASSWORD);
    }

    if (changePasswordDto.newPassword === changePasswordDto.currentPassword) {
      throw new BadRequestException('Mật khẩu mới không được trùng với mật khẩu hiện tại');
    }

    const hashedPassword = await hashPassword(changePasswordDto.newPassword);
    await this.usersService.update(userId, { password: hashedPassword });

    return { message: 'Đổi mật khẩu thành công' };
  }

  async getProfile(userId) {
    const user = await this.usersService.findById(userId);

    const employee = await AppDataSource.getRepository(EmployeeEntity).findOne({
      where: { userId: userId, isDeleted: false },
      relations: [
        'department',
        'position',
        'directManager',
        'jobGrade',
        'hrMentor',
      ],
    });

    return {
      // User account info
      id: user.id,
      username: user.username,
      email: user.email,
      companyEmail: employee?.companyEmail || null,
      roles: user.userRoles?.map((ur) => ur.role.roleName) || [],
      role: user.userRoles?.[0]?.role.roleName || null,
      status: user.status,

      // Personal info
      avatar: employee?.avatar || null,
      fullName: employee?.fullName || null,
      personalEmail: employee?.personalEmail || null,
      phoneNumber: employee?.phoneNumber || null,
      dateOfBirth: employee?.dateOfBirth || null,
      gender: employee?.gender || null,
      maritalStatus: employee?.maritalStatus || null,
      nationality: employee?.nationality || null,

      // Address info
      currentAddress: employee?.currentAddress || null,
      permanentAddress: employee?.permanentAddress || null,

      // Government IDs
      nationalId: employee?.nationalId || null,
      nationalIdIssuedDate: employee?.nationalIdIssuedDate || null,
      nationalIdIssuedPlace: employee?.nationalIdIssuedPlace || null,
      taxCode: employee?.taxCode || null,

      // Organization info
      department: employee?.department
        ? {
            id: employee.department.id,
            name: employee.department.departmentName,
          }
        : null,
      position: employee?.position
        ? {
            id: employee.position.id,
            name: employee.position.positionName,
          }
        : null,
      jobGrade: employee?.jobGrade
        ? {
            id: employee.jobGradeId,
            name: employee.jobGrade.gradeName,
          }
        : null,
      manager: employee?.directManager?.fullName || null,
      directManager: employee?.directManager
        ? {
            id: employee.directManager.id,
            name: employee.directManager.fullName,
          }
        : null,
      hrMentor: employee?.hrMentor?.fullName || null,
      employmentStatus: employee?.employmentStatus || null,
      joinDate: employee?.joinDate || null,

      // System info
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginTime: user.lastLoginTime,
    };
  }

  async editProfile(userId, updateProfileDto) {
    const employeeRepo = new EmployeesRepository();
    const actionLogsRepo = new ActionLogsRepository();

    const employee = await AppDataSource.getRepository(EmployeeEntity).findOne({
      where: { userId: userId, isDeleted: false },
      relations: [
        'department',
        'position',
        'directManager',
        'jobGrade',
        'hrMentor',
      ],
    });

    if (!employee) {
      throw new NotFoundException(AppMessages.Errors.Employee.NOT_FOUND);
    }

    // Store previous data for audit logging
    const beforeData = {
      // fullName intentionally not part of editable data
      personalEmail: employee.personalEmail,
      phoneNumber: employee.phoneNumber,
      currentAddress: employee.currentAddress,
      permanentAddress: employee.permanentAddress,
      avatar: employee.avatar,
    };

    // Prevent full name changes coming from client
    if (
      updateProfileDto.fullName &&
      updateProfileDto.fullName !== employee.fullName
    ) {
      throw new BadRequestException('Không được phép chỉnh sửa họ và tên');
    }
    // Remove if present to avoid accidental overwrite
    delete updateProfileDto.fullName;

    // Update employee
    const updated = await employeeRepo.update(employee.id, updateProfileDto);

    // Track changed fields
    const changedFields = [];
    Object.keys(beforeData).forEach((key) => {
      if (beforeData[key] !== updateProfileDto[key]) {
        changedFields.push(key);
      }
    });

    // Log action if there are changes
    if (changedFields.length > 0) {
      try {
        await actionLogsRepo.create({
          userId: userId,
          actionType: 'UPDATE',
          targetTable: 'employees',
          targetRecordId: employee.id,
          beforeData,
          afterData: updateProfileDto,
          changedFields,
          description: `Profile updated: ${changedFields.join(', ')}`,
        });
      } catch (error) {
        console.error('Failed to log action:', error);
        // Don't throw error, just log it
      }
    }

    return {
      id: updated.id,
      fullName: updated.fullName,
      avatar: updated.avatar,
      companyEmail: updated.companyEmail,
      personalEmail: updated.personalEmail,
      phoneNumber: updated.phoneNumber,
      currentAddress: updated.currentAddress,
      permanentAddress: updated.permanentAddress,
      department: updated.department
        ? {
            id: updated.department.id,
            name: updated.department.departmentName,
          }
        : null,
      position: updated.position
        ? {
            id: updated.position.id,
            name: updated.position.positionName,
          }
        : null,
      jobGrade: updated.jobGrade
        ? {
            id: updated.jobGrade.id,
            name: updated.jobGrade.name,
          }
        : null,
      manager: updated.directManager?.fullName || null,
      hrMentor: updated.hrMentor?.fullName || null,
    };
  }

  async generateTokens(user) {
    const payload = {
      sub: user.id,
      email: user.email,
      roles: user.userRoles?.map((ur) => ur.role.roleName) || [],
    };

    const secret = process.env.JWT_SECRET;
    const refreshSecret = process.env.JWT_REFRESH_SECRET;
    const expiresIn = process.env.JWT_EXPIRES_IN || '15m';
    const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

    if (!secret || !refreshSecret) {
      throw new Error('JWT secrets are not defined');
    }

    const [accessToken, refreshToken] = await Promise.all([
      jwt.sign(payload, secret, { expiresIn: expiresIn }),
      jwt.sign(payload, refreshSecret, { expiresIn: refreshExpiresIn }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }
  async forgotPassword(email) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return {
        message: AppMessages.Success.Auth.PASSWORD_RESET_REQUESTED,
      };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');

    const hashedToken = hashResetPasswordToken(resetToken);

    const redisKey = `reset-password:${hashedToken}`;

    await this.cacheService.set(redisKey, user.id, 5 * 60);

    // 4. Tạo link reset
    const resetUrl = `${config.frontEndUrl}/forgot-password?token=${resetToken}`;

    // 5. Gửi email
    await this.mailService.sendResetPasswordEmail(
      user.email,
      user.username,
      resetUrl,
    );

    return {
      message: AppMessages.Success.Auth.PASSWORD_RESET_REQUESTED,
    };
  }

  async resetPassword(token, newPassword) {
    const hashedToken = hashResetPasswordToken(token);

    const redisKey = `reset-password:${hashedToken}`;

    const userId = await this.cacheService.get(redisKey);

    if (!userId) {
      throw new BadRequestException(
        AppMessages.Errors.Auth.RESET_TOKEN_INVALID,
      );
    }

    const user = await this.usersService.findByIdWithPassword(userId);

    const duplicatePassword = await comparePassword(newPassword, user.password);

    if (duplicatePassword) {
      throw new BadRequestException(
        AppMessages.Errors.Auth.PASSWORD_NOT_DIFFERENT,
      );
    }

    await this.usersService.update(userId, {
      password: newPassword,
    });

    // Xóa token sau khi dùng
    await this.cacheService.del(redisKey);

    return { message: AppMessages.Success.Auth.PASSWORD_RESET_SUCCESS };
  }
}
