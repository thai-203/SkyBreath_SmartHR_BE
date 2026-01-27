import { Request, Response, NextFunction } from 'express';
import { ForbiddenException, UnauthorizedException } from '../exceptions';
import { AppMessages } from '../constants';

export const permissionsMiddleware = (requiredPermission: string) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = req.user;

        if (!user) {
            next(new UnauthorizedException(AppMessages.Errors.Auth.UNAUTHORIZED));
            return;
        }

        const hasPermission = user.permissions?.includes(requiredPermission);

        if (!hasPermission) {
            next(new ForbiddenException(AppMessages.Errors.Auth.FORBIDDEN));
            return;
        }

        next();
    };
};
