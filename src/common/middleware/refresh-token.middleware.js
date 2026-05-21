import * as jwt from 'jsonwebtoken';
import { AppDataSource } from '../../database/data-source.js';
import { UserEntity } from '../../models/entities/user.entity.js';
import { UnauthorizedException } from '../exceptions/index.js';
import { AppMessages } from '../constants/index.js';
import { config } from '../../config/env.config.js';
import { setRequestContextValue } from '../context/request-context.js';

export const refreshTokenMiddleware = async (req, res, next) => {
  console.log('[RefreshTokenMiddleware] All cookies:', req.cookies);
  console.log('[RefreshTokenMiddleware] Cookie header:', req.headers.cookie);
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    console.error('[RefreshTokenMiddleware] No refresh token found in cookies');
    next(new UnauthorizedException(AppMessages.Errors.Auth.TOKEN_INVALID));
    return;
  }

  try {
    const secret = config.jwt.refreshSecret;

    if (!secret) {
      console.error('[RefreshTokenMiddleware] JWT_REFRESH_SECRET is missing in config');
      throw new Error('Lỗi hệ thống, vui lòng thử lại sau');
    }

    const decoded = jwt.verify(refreshToken, secret);

    if (!decoded || !decoded.sub) {
      console.error('[RefreshTokenMiddleware] Invalid token payload');
      throw new UnauthorizedException(AppMessages.Errors.Auth.TOKEN_INVALID);
    }

    const userRepository = AppDataSource.getRepository(UserEntity);
    const user = await userRepository.findOne({
      where: { id: decoded.sub, isDeleted: false },
    });

    if (!user) {
      console.error(`[RefreshTokenMiddleware] User not found: ${decoded.sub}`);
      throw new UnauthorizedException(AppMessages.Errors.Auth.ACCOUNT_NOT_FOUND);
    }

    if (user.status === 'LOCKED') {
      throw new UnauthorizedException(AppMessages.Errors.Auth.ACCOUNT_LOCKED);
    }

    if (user.status === 'INACTIVE') {
      throw new UnauthorizedException(AppMessages.Errors.Auth.ACCOUNT_INACTIVE);
    }

    if (user.mustChangePassword) {
      throw new UnauthorizedException(
        AppMessages.Errors.Auth.PASSWORD_CHANGE_REQUIRED,
      );
    }

    // Gắn user tối thiểu vào req để controller dùng
    req.user = {
      id: user.id,
      email: user.email,
    };
    setRequestContextValue('userId', user.id);
    next();
  } catch (error) {
    console.error('[RefreshTokenMiddleware] Error verifying refresh token:', error.message);
    if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedException(AppMessages.Errors.Auth.TOKEN_EXPIRED));
    } else if (error instanceof UnauthorizedException) {
      next(error);
    } else {
      next(new UnauthorizedException(AppMessages.Errors.Auth.TOKEN_INVALID));
    }
  }
};
