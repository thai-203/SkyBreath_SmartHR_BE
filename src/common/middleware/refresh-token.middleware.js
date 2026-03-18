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
        next(new UnauthorizedException(AppMessages.Errors.Auth.UNAUTHORIZED));
        return;
    }
    
    try {
        const secret = config.jwt.refreshSecret;
        
        if (!secret) {
            throw new Error('JWT_REFRESH_SECRET is not defined');
        }
        
        const decoded = jwt.verify(refreshToken, secret);
        
        const userRepository = AppDataSource.getRepository(UserEntity);
        const user = await userRepository.findOne({
            where: { id: decoded.sub }
        });
        
        if (!user || user.status !== 'ACTIVE') {
            next(new UnauthorizedException(AppMessages.Errors.User.INACTIVE));
            return;
        }
        
        // Gắn user tối thiểu vào req để controller dùng
        req.user = {
            id: user.id,
            email: user.email
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
