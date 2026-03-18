import { AppMessages } from '../constants/index.js';
import { ForbiddenException, UnauthorizedException } from '../exceptions/index.js';

export const permissionsMiddleware = (requiredPermission) => {
    return (req, res, next) => {
        const user = req.user;
        if (!user) {
            next(new UnauthorizedException(AppMessages.Errors.Auth.UNAUTHORIZED));
            return;
        }

        const hasPermission = user.permissions?.includes(requiredPermission);

        console.log(`[Permission] Checking for ${requiredPermission}. User has:`, user.permissions, `Result: ${hasPermission}`);

        if (!hasPermission) {
            next(new ForbiddenException(AppMessages.Errors.Auth.FORBIDDEN));
            return;
        }

        next();
    };
};
