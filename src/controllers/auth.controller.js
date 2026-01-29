import * as jwt from 'jsonwebtoken';
import { AuthService } from '../services/auth.service.js';
import { ResponseUtil } from '../common/utils/response.util.js';
import { AppMessages } from '../common/constants/index.js';

export class AuthController {
    constructor() {
        this.authService = new AuthService();
    }

    login = async (req, res, next) => {
        try {
            const { email, password } = req.body;
            const user = await this.authService.validateUser(email, password);

            if (!user) {
                const error = new Error('Invalid credentials');
                error.statusCode = 401;
                throw error;
            }

            const resultToken = await this.authService.login(user);
            ResponseUtil.sendResponse(res, AppMessages.Success.Auth.LOGIN, resultToken);
        } catch (error) {
            next(error);
        }
    }

    register = async (req, res, next) => {
        try {
            const result = await this.authService.register(req.body);
            ResponseUtil.sendResponse(res, AppMessages.Success.Auth.REGISTER, result, 201);
        } catch (error) {
            next(error);
        }
    }

    refreshTokens = async (req, res, next) => {
        try {
            const refreshToken = req.body.refreshToken;
            if (!refreshToken) {
                const error = new Error('Refresh token is required');
                error.statusCode = 400;
                throw error;
            }

            const decoded = jwt.decode(refreshToken);
            if (!decoded || !decoded.sub) {
                const error = new Error('Invalid refresh token');
                error.statusCode = 401;
                throw error;
            }

            const userId = decoded.sub;
            const result = await this.authService.refreshTokens(userId, refreshToken);
            ResponseUtil.sendResponse(res, AppMessages.Success.Auth.TOKENS_REFRESHED, result);
        } catch (error) {
            next(error);
        }
    }

    logout = async (req, res, next) => {
        try {
            const userId = req.user.id;
            const result = await this.authService.logout(userId);
            ResponseUtil.sendResponse(res, AppMessages.Success.Auth.LOGOUT, result);
        } catch (error) {
            next(error);
        }
    }

    changePassword = async (req, res, next) => {
        try {
            const userId = req.user.id;
            const result = await this.authService.changePassword(userId, req.body);
            ResponseUtil.sendResponse(res, AppMessages.Success.Auth.PASSWORD_CHANGED, result);
        } catch (error) {
            next(error);
        }
    }

    getProfile = async (req, res, next) => {
        try {
            const userId = req.user.id;
            const result = await this.authService.getProfile(userId);
            ResponseUtil.sendResponse(res, AppMessages.Success.Auth.PROFILE_RETRIEVED, result);
        } catch (error) {
            next(error);
        }
    }
}
