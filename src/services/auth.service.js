import * as jwt from 'jsonwebtoken';
import { UsersService } from './users.service.js';
import {
  hashPassword,
  comparePassword,
  hashResetPasswordToken,
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

    if (user.status !== 'ACTIVE') {
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

  //   async register(registerDto) {
  //     const existingUser = await this.usersService.findByEmail(registerDto.email);

  //     if (existingUser) {
  //       throw new ConflictException(AppMessages.Errors.User.ALREADY_EXISTS);
  //     }

  //     const hashedPassword = await hashPassword(registerDto.password);

  //     const user = await this.usersRepository.create({
  //       email: registerDto.email,
  //       username: registerDto.email, // Default username to email
  //       password: hashedPassword,
  //       status: 'ACTIVE',
  //     });

  //     // TODO: Assign default role using UserRoleEntity

  //     const tokens = await this.generateTokens(user);
  //     await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

  //     return {
  //       user: {
  //         id: user.id,
  //         email: user.email,
  //         username: user.username,
  //       },
  //       ...tokens,
  //     };
  //   }

  async refreshTokens(userId, refreshToken) {
    const user = await this.usersService.findById(userId);

    if (!user || !user.refreshToken) {
      throw new UnauthorizedException('Access denied');
    }

    if (user.refreshToken !== refreshToken) {
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
    await this.usersRepository.update(userId, { password: hashedPassword });

    return { message: 'Password changed successfully' };
  }

  async getProfile(userId) {
    const user = await this.usersService.findById(userId);
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      roles: user.userRoles?.map((ur) => ur.role.roleName) || [],
      status: user.status,
      lastLoginTime: user.lastLoginTime,
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

    const hashedPassword = await hashPassword(newPassword);

    await this.usersService.update(userId, {
      password: hashedPassword,
    });

    // Xóa token sau khi dùng
    await this.cacheService.del(redisKey);

    return { message: AppMessages.Success.Auth.PASSWORD_RESET_SUCCESS };
  }
}
