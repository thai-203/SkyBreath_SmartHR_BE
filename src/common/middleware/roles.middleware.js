import { ForbiddenException, UnauthorizedException } from '../exceptions/index.js';
import { AppMessages } from '../constants/index.js';

export const rolesMiddleware = (roles) => {
    return (req, res, next) => {
        const user = req.user;

        if (!user) {
            next(new UnauthorizedException(AppMessages.Errors.Auth.UNAUTHORIZED));
            return;
        }

        const hasRole = user.roles.some((role) => roles.includes(role));

        if (!hasRole) {
            next(new ForbiddenException(AppMessages.Errors.Auth.FORBIDDEN));
            return;
        }

        next();
    };
};
