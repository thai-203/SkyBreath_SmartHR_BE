import * as jwt from 'jsonwebtoken';
import { UsersService } from './users.service.js';
import { AppDataSource } from '../database/data-source.js';
import { EmployeeEntity } from '../models/entities/employee.entity.js';
import { EmployeesRepository } from '../repositories/employees.repository.js';
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

    const hashedPassword = await hashPassword(changePasswordDto.newPassword);
    await this.usersService.update(userId, { password: hashedPassword });

    return { message: 'Password changed successfully' };
  }

  async getProfile(userId) {
    const user = await this.usersService.findById(userId);

    const employee = await AppDataSource.getRepository(EmployeeEntity).findOne({
      where: { userId: userId, isDeleted: false },
      relations: ['department', 'position', 'directManager'],
    });

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      roles: user.userRoles?.map((ur) => ur.role.roleName) || [],
      status: user.status,
      lastLoginTime: user.lastLoginTime,
      avatar: employee?.avatar || null,
      fullName: employee?.fullName || null,
      position: employee?.position?.positionName || null,
      department: employee?.department?.departmentName || null,
      manager: employee?.directManager?.fullName || null,
      companyEmail: employee?.companyEmail || null,
      personalEmail: employee?.personalEmail || null,
      phoneNumber: employee?.phoneNumber || null,
      currentAddress: employee?.currentAddress || null,
      permanentAddress: employee?.permanentAddress || null,
    };
  }

  async editProfile(userId, updateProfileDto) {
    const employeeRepo = new EmployeesRepository();

    const employee = await AppDataSource.getRepository(EmployeeEntity).findOne({
      where: { userId: userId, isDeleted: false },
    });

    if (!employee) {
      throw new NotFoundException(AppMessages.Errors.Employee.NOT_FOUND);
    }

    const updated = await employeeRepo.update(employee.id, updateProfileDto);

    return {
      id: updated.id,
      fullName: updated.fullName,
      avatar: updated.avatar,
      companyEmail: updated.companyEmail,
      personalEmail: updated.personalEmail,
      phoneNumber: updated.phoneNumber,
      currentAddress: updated.currentAddress,
      permanentAddress: updated.permanentAddress,
      department: updated.department?.departmentName || null,
      position: updated.position?.positionName || null,
      manager: updated.directManager?.fullName || null,
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
