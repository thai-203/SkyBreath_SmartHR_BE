import { Request, Response, NextFunction } from 'express';
import { ForbiddenException, UnauthorizedException } from '../exceptions';
import { AppMessages } from '../constants';

export const rolesMiddleware = (roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = req.user;

        if (!user) {
            next(new UnauthorizedException(AppMessages.Errors.Auth.UNAUTHORIZED));
            return;
        }

        const hasRole = user.roles.some((role: string) => roles.includes(role));

        if (!hasRole) {
            next(new ForbiddenException(AppMessages.Errors.Auth.FORBIDDEN));
            return;
        }

        next();
    };
};
