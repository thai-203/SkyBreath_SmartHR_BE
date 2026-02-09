import * as jwt from 'jsonwebtoken';
import { AuthService } from '../services/auth.service.js';
import { ResponseUtil } from '../common/utils/response.util.js';
import { AppMessages } from '../common/constants/index.js';
import ms from 'ms';

export class AuthController {
  constructor() {
    this.authService = new AuthService();
  }

  login = async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const user = await this.authService.validateUser(email, password);
      const ip = req.headers['x-forwarded-for']?.split(',')[0];
      console.log(req.ip);

      if (!user) {
        const error = new Error('Invalid credentials');
        error.statusCode = 401;
        throw error;
      }

      const { refreshToken, ...resultToken } =
        await this.authService.login(user);
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true, // JS frontend không đọc được
        secure: false,
        sameSite: 'lax', // cross-site
        maxAge: ms(process.env.JWT_REFRESH_EXPIRES_IN), // 7 ngày
      });

      ResponseUtil.sendResponse(
        res,
        AppMessages.Success.Auth.LOGIN,
        resultToken,
      );
    } catch (error) {
      next(error);
    }
  };

  register = async (req, res, next) => {
    try {
      const result = await this.authService.register(req.body);
      ResponseUtil.sendResponse(
        res,
        AppMessages.Success.Auth.REGISTER,
        result,
        201,
      );
    } catch (error) {
      next(error);
    }
  };

  refreshTokens = async (req, res, next) => {
    try {
      const refreshToken = req.cookies?.refreshToken;
      const userId = req.user.id;
      const result = await this.authService.refreshTokens(userId, refreshToken);
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true, // JS frontend không đọc được
        secure: false,
        sameSite: 'lax', // cross-site
        maxAge: ms(process.env.JWT_REFRESH_EXPIRES_IN), // 7 ngày
      });
      ResponseUtil.sendResponse(
        res,
        AppMessages.Success.Auth.TOKENS_REFRESHED,
        result.accessToken,
      );
    } catch (error) {
      next(error);
    }
  };

  logout = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const result = await this.authService.logout(userId);
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
      });

      ResponseUtil.sendResponse(res, AppMessages.Success.Auth.LOGOUT, result);
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const result = await this.authService.changePassword(userId, req.body);
      ResponseUtil.sendResponse(
        res,
        AppMessages.Success.Auth.PASSWORD_CHANGED,
        result,
      );
    } catch (error) {
      next(error);
    }
  };

  getProfile = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const result = await this.authService.getProfile(userId);
      ResponseUtil.sendResponse(
        res,
        AppMessages.Success.Auth.PROFILE_RETRIEVED,
        result,
      );
    } catch (error) {
      next(error);
    }
  };
  forgotPassword = async (req, res, next) => {
    try {
      const { email } = req.body;

      await this.authService.forgotPassword(email);

      return ResponseUtil.sendResponse(
        res,
        AppMessages.Success.Auth.PASSWORD_RESET_REQUESTED,
      );
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req, res, next) => {
    try {
      const { token, newPassword } = req.body;

      await this.authService.resetPassword(token, newPassword);

      return ResponseUtil.sendResponse(
        res,
        AppMessages.Success.Auth.PASSWORD_RESET_SUCCESS,
      );
    } catch (error) {
      next(error);
    }
  };
}
