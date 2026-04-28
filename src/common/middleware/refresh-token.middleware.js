import * as jwt from 'jsonwebtoken';
import { AppDataSource } from '../../database/data-source.js';
import { UserEntity } from '../../models/entities/user.entity.js';
import { UnauthorizedException } from '../exceptions/index.js';
import { AppMessages } from '../constants/index.js';
import { config } from '../../config/env.config.js';
import { setRequestContextValue } from '../context/request-context.js';

export const refreshTokenMiddleware = async (req, res, next) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    next(new UnauthorizedException(AppMessages.Errors.Auth.TOKEN_INVALID));
    return;
  }

  try {
    const secret = config.jwt.refreshSecret;

    if (!secret) {
      throw new Error('Lỗi hệ thống, vui lòng thử lại sau');
    }

    const decoded = jwt.verify(refreshToken, secret);

    if (!decoded) {
      throw new UnauthorizedException(AppMessages.Errors.Auth.TOKEN_EXPIRED);
    }

    const userRepository = AppDataSource.getRepository(UserEntity);
    const user = await userRepository.findOne({
      where: { id: decoded.sub, isDeleted: false },
    });

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
    if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedException(AppMessages.Errors.Auth.TOKEN_EXPIRED));
    } else {
      next(new UnauthorizedException(AppMessages.Errors.Auth.TOKEN_INVALID));
    }
  }
};
