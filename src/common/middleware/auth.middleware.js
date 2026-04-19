import * as jwt from 'jsonwebtoken';
import { AppDataSource } from '../../database/data-source.js';
import { UserEntity } from '../../models/entities/user.entity.js';
import { AppMessages } from '../constants/index.js';
import { UnauthorizedException } from '../exceptions/index.js';
import { setRequestContextValue } from '../context/request-context.js';

export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    next(new UnauthorizedException(AppMessages.Errors.Auth.UNAUTHORIZED));
    return;
  }

  const token = authHeader.split(' ')[1];

  if (!token) {
    next(new UnauthorizedException(AppMessages.Errors.Auth.TOKEN_INVALID));
    return;
  }

  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }

    const decoded = jwt.verify(token, secret);

    const userRepository = AppDataSource.getRepository(UserEntity);
    const user = await userRepository.findOne({
      where: { id: decoded.sub },
      relations: [
        'userRoles',
        'userRoles.role',
        'userRoles.role.rolePermissions',
        'userRoles.role.rolePermissions.permission',
      ],
    });

    if (!user || user.status !== 'ACTIVE') {
      next(new UnauthorizedException(AppMessages.Errors.User.INACTIVE));
      return;
    }
    if (user.mustChangePassword) {
      next(new UnauthorizedException(AppMessages.Errors.Auth.PASSWORD_CHANGE_REQUIRED));
      return;
    }

    // Extract unique permissions
    const permissions = new Set();
    user.userRoles?.forEach((ur) => {
      ur.role.rolePermissions?.forEach((rp) => {
        if (rp.permission && !rp.isDeleted) {
          permissions.add(rp.permission.permissionCode);
        }
      });
    });

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      roles: user.userRoles?.map((ur) => ur.role.roleName) || [],
      permissions: Array.from(permissions),
    };
    setRequestContextValue("userId", user.id)
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedException(AppMessages.Errors.Auth.TOKEN_EXPIRED));
    } else {
      next(new UnauthorizedException(AppMessages.Errors.Auth.TOKEN_INVALID));
    }
  }
};
