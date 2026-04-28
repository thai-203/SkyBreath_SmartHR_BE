import 'reflect-metadata';
import { AuthService } from '../auth.service.js';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '../../common/exceptions/index.js';
import {
  comparePassword,
  compareRefreshToken,
  hashResetPasswordToken,
  hashPassword,
} from '../../common/utils/index.js';
import { setRequestContextValue } from '../../common/context/request-context.js';
import * as jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { v4 } from 'uuid';

jest.mock('../../common/utils/index.js', () => ({
  comparePassword: jest.fn(),
  compareRefreshToken: jest.fn(),
  hashPassword: jest.fn(),
  hashResetPasswordToken: jest.fn(),
}));

jest.mock('../../common/context/request-context.js', () => ({
  setRequestContextValue: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

jest.mock('crypto', () => ({
  randomInt: jest.fn(),
}));

jest.mock('../../database/data-source.js', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock('../../repositories/action-logs.repository.js', () => ({
  ActionLogsRepository: jest.fn(),
}));

jest.mock('../../repositories/employees.repository.js', () => ({
  EmployeesRepository: jest.fn(),
}));

jest.mock('../mail.service.js', () => ({
  MailService: jest.fn(),
}));

jest.mock('../../config/env.config.js', () => ({
  config: {
    frontEndUrl: 'http://localhost:3000',
    mail: {
      host: 'localhost',
      port: 587,
      secure: false,
      user: 'test',
      pass: 'test',
      from: 'test@example.com',
    },
  },
}));

describe('AuthService', () => {
  let authService;
  let mockUsersRepository;
  let mockMailService;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUsersRepository = {
      findByEmailWithPasswordBuilder: jest.fn(),
      findById: jest.fn(),
      updateRefreshToken: jest.fn(),
      updateLastLogin: jest.fn(),
      findByEmail: jest.fn(),
      update: jest.fn(),
      findOne: jest.fn(),
    };

    mockMailService = {
      sendResetPasswordEmail: jest.fn(),
    };

    authService = new AuthService(mockMailService, mockUsersRepository);

    // Default JWT sign behavior
    jwt.sign.mockReturnValue('mock-token');

    // Set up default env vars for generateTokens
    process.env.JWT_SECRET = 'secret';
    process.env.JWT_REFRESH_SECRET = 'refresh-secret';
  });

  describe('login', () => {
    describe('_validateUser (via login)', () => {
      it('should throw BadRequestException if email is missing', async () => {
        await expect(authService.login(null, 'password')).rejects.toThrow(
          BadRequestException,
        );
      });

      it('should throw BadRequestException if password is missing', async () => {
        await expect(
          authService.login('test@example.com', null),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException if email is invalid', async () => {
        await expect(
          authService.login('invalid-email', 'Password123!'),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException if password format is invalid', async () => {
        await expect(
          authService.login('test@example.com', 'weak'),
        ).rejects.toThrow(BadRequestException);
      });

      it('should throw UnauthorizedException if user is not found', async () => {
        mockUsersRepository.findByEmailWithPasswordBuilder.mockResolvedValue(
          null,
        );

        await expect(
          authService.login('test@example.com', 'Password123!'),
        ).rejects.toThrow(UnauthorizedException);
      });

      it('should throw UnauthorizedException if password does not match', async () => {
        mockUsersRepository.findByEmailWithPasswordBuilder.mockResolvedValue({
          password: 'hashed-password',
        });
        comparePassword.mockResolvedValue(false);

        await expect(
          authService.login('test@example.com', 'Password123!'),
        ).rejects.toThrow(UnauthorizedException);
      });

      it('should throw UnauthorizedException if account is LOCKED', async () => {
        mockUsersRepository.findByEmailWithPasswordBuilder.mockResolvedValue({
          password: 'hashed-password',
          status: 'LOCKED',
        });
        comparePassword.mockResolvedValue(true);

        await expect(
          authService.login('test@example.com', 'Password123!'),
        ).rejects.toThrow(UnauthorizedException);
      });

      it('should throw UnauthorizedException if account is INACTIVE', async () => {
        mockUsersRepository.findByEmailWithPasswordBuilder.mockResolvedValue({
          password: 'hashed-password',
          status: 'INACTIVE',
        });
        comparePassword.mockResolvedValue(true);

        await expect(
          authService.login('test@example.com', 'Password123!'),
        ).rejects.toThrow(UnauthorizedException);
      });

      it('should throw UnauthorizedException if password change is required', async () => {
        mockUsersRepository.findByEmailWithPasswordBuilder.mockResolvedValue({
          password: 'hashed-password',
          status: 'ACTIVE',
          mustChangePassword: true,
        });
        comparePassword.mockResolvedValue(true);

        await expect(
          authService.login('test@example.com', 'Password123!'),
        ).rejects.toThrow(UnauthorizedException);
      });
    });

    describe('login Success', () => {
      it('should return user info and tokens on successful login', async () => {
        const mockUser = {
          id: 1,
          email: 'test@example.com',
          username: 'testuser',
          status: 'ACTIVE',
          mustChangePassword: false,
          password: 'hashed-password',
          userRoles: [
            {
              role: {
                roleName: 'ADMIN',
                rolePermissions: [
                  { permission: { permissionCode: 'READ_USER' } },
                  { permission: { permissionCode: 'WRITE_USER' } },
                ],
              },
            },
          ],
        };

        mockUsersRepository.findByEmailWithPasswordBuilder.mockResolvedValue(
          mockUser,
        );
        comparePassword.mockResolvedValue(true);
        jwt.sign
          .mockReturnValueOnce('access-token')
          .mockReturnValueOnce('refresh-token');

        const result = await authService.login(
          'test@example.com',
          'Password123!',
        );

        expect(setRequestContextValue).toHaveBeenCalledWith(
          'userId',
          mockUser.id,
        );
        expect(mockUsersRepository.updateRefreshToken).toHaveBeenCalledWith(
          mockUser.id,
          'refresh-token',
        );
        expect(mockUsersRepository.updateLastLogin).toHaveBeenCalledWith(
          mockUser.id,
        );

        expect(result).toEqual({
          user: {
            id: mockUser.id,
            email: mockUser.email,
            username: mockUser.username,
            roles: ['ADMIN'],
            permissions: ['READ_USER', 'WRITE_USER'],
          },
          accessToken: 'access-token',
          refreshToken: 'refresh-token',
        });
      });

      it('should handle user with no roles correctly', async () => {
        const mockUser = {
          id: 1,
          email: 'test@example.com',
          username: 'testuser',
          status: 'ACTIVE',
          mustChangePassword: false,
          password: 'hashed-password',
          userRoles: null,
        };

        mockUsersRepository.findByEmailWithPasswordBuilder.mockResolvedValue(
          mockUser,
        );
        comparePassword.mockResolvedValue(true);

        const result = await authService.login(
          'test@example.com',
          'Password123!',
        );

        expect(result.user.roles).toEqual([]);
        expect(result.user.permissions).toEqual([]);
      });

      it('should throw error if JWT secrets are missing', async () => {
        const mockUser = {
          id: 1,
          email: 'test@example.com',
          status: 'ACTIVE',
          password: 'hashed-password',
        };

        mockUsersRepository.findByEmailWithPasswordBuilder.mockResolvedValue(
          mockUser,
        );
        comparePassword.mockResolvedValue(true);

        const originalSecret = process.env.JWT_SECRET;
        const originalRefreshSecret = process.env.JWT_REFRESH_SECRET;
        delete process.env.JWT_SECRET;
        delete process.env.JWT_REFRESH_SECRET;

        try {
          await expect(
            authService.login('test@example.com', 'Password123!'),
          ).rejects.toThrow('Lỗi hệ thống, vui lòng thử lại sau');
        } finally {
          process.env.JWT_SECRET = originalSecret;
          process.env.JWT_REFRESH_SECRET = originalRefreshSecret;
        }
      });
    });
  });

  describe('refreshTokens', () => {
    const mockUser = {
      id: 1,
      email: 'test@example.com',
      status: 'ACTIVE',
      refreshToken: 'valid-refresh-token',
      mustChangePassword: false,
    };

    it('should throw NotFoundException if user is not found', async () => {
      mockUsersRepository.findById.mockResolvedValue(null);

      await expect(
        authService.refreshTokens(1, 'some-token'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException if refresh token is missing in DB', async () => {
      mockUsersRepository.findById.mockResolvedValue({
        ...mockUser,
        refreshToken: null,
      });

      await expect(
        authService.refreshTokens(1, 'some-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if refresh token mismatch', async () => {
      mockUsersRepository.findById.mockResolvedValue(mockUser);
      compareRefreshToken.mockReturnValue(false);

      await expect(
        authService.refreshTokens(1, 'invalid-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if account is LOCKED', async () => {
      mockUsersRepository.findById.mockResolvedValue({
        ...mockUser,
        status: 'LOCKED',
      });
      compareRefreshToken.mockReturnValue(true);

      await expect(
        authService.refreshTokens(1, 'valid-refresh-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if account is INACTIVE', async () => {
      mockUsersRepository.findById.mockResolvedValue({
        ...mockUser,
        status: 'INACTIVE',
      });
      compareRefreshToken.mockReturnValue(true);

      await expect(
        authService.refreshTokens(1, 'valid-refresh-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password change is required', async () => {
      mockUsersRepository.findById.mockResolvedValue({
        ...mockUser,
        mustChangePassword: true,
      });
      compareRefreshToken.mockReturnValue(true);

      await expect(
        authService.refreshTokens(1, 'valid-refresh-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return new tokens on successful refresh', async () => {
      mockUsersRepository.findById.mockResolvedValue(mockUser);
      compareRefreshToken.mockReturnValue(true);
      jwt.sign
        .mockReturnValueOnce('new-access-token')
        .mockReturnValueOnce('new-refresh-token');

      const result = await authService.refreshTokens(
        1,
        'valid-refresh-token',
      );

      expect(mockUsersRepository.updateRefreshToken).toHaveBeenCalledWith(
        mockUser.id,
        'new-refresh-token',
      );
      expect(result).toEqual({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });
    });
  });

  describe('logout', () => {
    it('should call updateRefreshToken with null on logout', async () => {
      const userId = 1;
      await authService.logout(userId);

      expect(mockUsersRepository.updateRefreshToken).toHaveBeenCalledWith(
        userId,
        null,
      );
    });
  });

  describe('forgotPassword', () => {
    const email = 'test@example.com';
    const mockUser = {
      id: 1,
      email: email,
      username: 'testuser',
      status: 'ACTIVE',
      mustChangePassword: false,
    };

    it('should throw BadRequestException if email is missing', async () => {
      await expect(authService.forgotPassword(null)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if email is invalid', async () => {
      await expect(
        authService.forgotPassword('invalid-email'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return security message if user is not found', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue(null);

      const result = await authService.forgotPassword(email);

      expect(result).toEqual({
        message: 'Nếu email tồn tại, OTP sẽ được gửi',
      });
    });

    it('should throw UnauthorizedException if account is LOCKED', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        status: 'LOCKED',
      });
      await expect(authService.forgotPassword(email)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if account is INACTIVE', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        status: 'INACTIVE',
      });
      await expect(authService.forgotPassword(email)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException if password change is required', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue({
        ...mockUser,
        mustChangePassword: true,
      });
      await expect(authService.forgotPassword(email)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should send reset email on success', async () => {
      mockUsersRepository.findByEmail.mockResolvedValue(mockUser);
      const mockOtp = 123456;
      const mockRequestId = 'mock-uuid';
      const mockHashedOtp = 'hashed-otp';

      crypto.randomInt.mockReturnValue(mockOtp);
      v4.mockReturnValue(mockRequestId);
      hashResetPasswordToken.mockReturnValue(mockHashedOtp);

      const result = await authService.forgotPassword(email);

      expect(mockUsersRepository.update).toHaveBeenCalledWith(mockUser.id, {
        otp: mockHashedOtp,
        otpExpiresAt: expect.any(Date),
        otpRequestId: mockRequestId,
      });

      expect(mockMailService.sendResetPasswordEmail).toHaveBeenCalledWith(
        mockUser.email,
        mockUser.username,
        expect.stringContaining(mockRequestId),
      );

      expect(result).toEqual({
        message: 'OTP đã được gửi đến email của bạn',
        otpRequestId: mockRequestId,
      });
    });
  });

  describe('resetPasswordWithOtp', () => {
    const otpRequestId = 'mock-uuid';
    const otp = '123456';
    const newPassword = 'NewPassword123!';
    const mockUser = {
      id: 1,
      status: 'ACTIVE',
      mustChangePassword: false,
      otp: 'hashed-otp',
      otpExpiresAt: new Date(Date.now() + 10000),
    };

    it('should throw BadRequestException if otpRequestId is missing', async () => {
      await expect(
        authService.resetPasswordWithOtp(null, otp, newPassword),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if otp is missing', async () => {
      await expect(
        authService.resetPasswordWithOtp(otpRequestId, null, newPassword),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if otp is not 6 digits', async () => {
      await expect(
        authService.resetPasswordWithOtp(otpRequestId, '123', newPassword),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if newPassword is missing', async () => {
      await expect(
        authService.resetPasswordWithOtp(otpRequestId, otp, null),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if newPassword format is invalid', async () => {
      await expect(
        authService.resetPasswordWithOtp(otpRequestId, otp, 'weak'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if user is not found', async () => {
      mockUsersRepository.findOne.mockResolvedValue(null);

      await expect(
        authService.resetPasswordWithOtp(otpRequestId, otp, newPassword),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw UnauthorizedException if account is LOCKED', async () => {
      mockUsersRepository.findOne.mockResolvedValue({
        ...mockUser,
        status: 'LOCKED',
      });

      await expect(
        authService.resetPasswordWithOtp(otpRequestId, otp, newPassword),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if account is INACTIVE', async () => {
      mockUsersRepository.findOne.mockResolvedValue({
        ...mockUser,
        status: 'INACTIVE',
      });

      await expect(
        authService.resetPasswordWithOtp(otpRequestId, otp, newPassword),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password change is required', async () => {
      mockUsersRepository.findOne.mockResolvedValue({
        ...mockUser,
        mustChangePassword: true,
      });

      await expect(
        authService.resetPasswordWithOtp(otpRequestId, otp, newPassword),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw BadRequestException if OTP is missing in DB', async () => {
      mockUsersRepository.findOne.mockResolvedValue({
        ...mockUser,
        otp: null,
      });

      await expect(
        authService.resetPasswordWithOtp(otpRequestId, otp, newPassword),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if OTP is expired', async () => {
      mockUsersRepository.findOne.mockResolvedValue({
        ...mockUser,
        otpExpiresAt: new Date(Date.now() - 10000),
      });

      await expect(
        authService.resetPasswordWithOtp(otpRequestId, otp, newPassword),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if OTP is incorrect', async () => {
      mockUsersRepository.findOne.mockResolvedValue(mockUser);
      hashResetPasswordToken.mockReturnValue('different-hash');

      await expect(
        authService.resetPasswordWithOtp(otpRequestId, otp, newPassword),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reset password on success', async () => {
      mockUsersRepository.findOne.mockResolvedValue(mockUser);
      hashResetPasswordToken.mockReturnValue('hashed-otp');
      hashPassword.mockResolvedValue('new-hashed-password');

      const result = await authService.resetPasswordWithOtp(
        otpRequestId,
        otp,
        newPassword,
      );

      expect(mockUsersRepository.update).toHaveBeenCalledWith(mockUser.id, {
        password: 'new-hashed-password',
        otp: null,
        otpExpiresAt: null,
        otpRequestId: null,
        mustChangePassword: false,
      });

      expect(result).toEqual({
        message: 'Mật khẩu đã được đặt lại thành công',
      });
    });
  });
});
