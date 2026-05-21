import { AuthService } from '../services/auth.service.js';
import { ResponseUtil } from '../common/utils/response.util.js';
import { AppMessages } from '../common/constants/index.js';
import { config } from '../config/env.config.js';
import ms from 'ms';
import { plainToInstance } from 'class-transformer';
import { LoginDto } from '../models/dto/auth/login.dto.js';
import { ResetPasswordOtpDto } from '../models/dto/auth/reset-password-otp.dto.js';
import { UpdateProfileDto } from '../models/dto/auth/update-profile.dto.js';
import { ChangePasswordDto } from '../models/dto/auth/change-password.dto.js';

export class AuthController {
  constructor() {
    this.authService = new AuthService();
  }

  login = async (req, res, next) => {
    try {
      const loginDto = plainToInstance(LoginDto, req.body);
      const { refreshToken, ...resultToken } = await this.authService.login(
        loginDto.email,
        loginDto.password,
      );
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: ms(config.jwt.refreshExpiresIn),
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

  refreshTokens = async (req, res, next) => {
    try {
      const refreshToken = req.cookies?.refreshToken;
      const userId = req.user.id;
      const result = await this.authService.refreshTokens(userId, refreshToken);
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: ms(config.jwt.refreshExpiresIn),
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
      await this.authService.logout(userId);
      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
      });

      ResponseUtil.sendResponse(res, AppMessages.Success.Auth.LOGOUT, {});
    } catch (error) {
      next(error);
    }
  };

  changePassword = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const changePasswordDto = plainToInstance(ChangePasswordDto, req.body);
      const result = await this.authService.changePassword(
        userId,
        changePasswordDto,
      );
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

  editProfile = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const updateDto = plainToInstance(UpdateProfileDto, req.body);
      if (req.file) {
        updateDto.avatar = req.file.path.replace(/\\/g, '/');
      }
      const result = await this.authService.editProfile(userId, updateDto);
      ResponseUtil.sendResponse(res, 'Cập nhật hồ sơ thành công', result);
    } catch (error) {
      next(error);
    }
  };

  forgotPassword = async (req, res, next) => {
    try {
      const { email } = req.body;

      const result = await this.authService.forgotPassword(email);

      return ResponseUtil.sendResponse(
        res,
        AppMessages.Success.Auth.PASSWORD_RESET_REQUESTED,
        result,
      );
    } catch (error) {
      next(error);
    }
  };

  resetPasswordWithOtp = async (req, res, next) => {
    try {
      const { otpRequestId, otp, newPassword } = plainToInstance(
        ResetPasswordOtpDto,
        req.body,
      );

      const result = await this.authService.resetPasswordWithOtp(
        otpRequestId,
        otp,
        newPassword,
      );

      return ResponseUtil.sendResponse(
        res,
        AppMessages.Success.Auth.PASSWORD_RESET_SUCCESS,
        result,
      );
    } catch (error) {
      next(error);
    }
  };
}
