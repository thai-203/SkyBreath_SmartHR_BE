import { AuthService } from '../auth.service.js';
import {
  comparePassword,
  compareRefreshToken,
  hashResetPasswordToken,
} from '../../common/utils/index.js';
import { setRequestContextValue } from '../../common/context/request-context.js';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

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

jest.mock('../../config/env.config.js', () => ({
  config: {
    frontEndUrl: 'https://frontend.example.com',
  },
}));

describe('AuthService', () => {
  let service;
  let usersService;
  let mailService;

  const expectRejectWithStatus = async (promise, statusCode) => {
    try {
      await promise;
      throw new Error('Expected promise to reject');
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect(err.statusCode).toBe(statusCode);
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'access-secret';
    process.env.JWT_REFRESH_SECRET = 'refresh-secret';
    process.env.JWT_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';

    usersService = {
      findByEmailWithPassword: jest.fn(),
      findById: jest.fn(),
      findByIdWithPassword: jest.fn(),
      findByEmail: jest.fn(),
      findByOtpRequestId: jest.fn(),
      updateRefreshToken: jest.fn(),
      updateLastLogin: jest.fn(),
      update: jest.fn(),
    };

    mailService = {
      sendResetPasswordEmail: jest.fn(),
      AdminResetPasswordEmail: jest.fn(),
    };

    service = new AuthService(usersService, {}, mailService);
  });

  it('returns null when validating a missing user', async () => {
    usersService.findByEmailWithPassword.mockResolvedValue(null);

    await expect(
      service.validateUser('test@example.com', 'secret'),
    ).resolves.toBeNull();
    expect(comparePassword).not.toHaveBeenCalled();
  });

  it('returns null when password is invalid', async () => {
    usersService.findByEmailWithPassword.mockResolvedValue({
      id: 1,
      password: 'hash',
      status: 'ACTIVE',
      isDeleted: false,
    });
    comparePassword.mockResolvedValue(false);

    await expect(
      service.validateUser('test@example.com', 'wrong'),
    ).resolves.toBeNull();
  });

  it('throws UnauthorizedException when validating inactive user', async () => {
    usersService.findByEmailWithPassword.mockResolvedValue({
      id: 1,
      password: 'hash',
      status: 'INACTIVE',
      isDeleted: false,
    });
    comparePassword.mockResolvedValue(true);

    await expectRejectWithStatus(
      service.validateUser('test@example.com', 'secret'),
      401,
    );
  });

  it('logs in user and persists refresh token', async () => {
    jwt.sign
      .mockReturnValueOnce('access-token')
      .mockReturnValueOnce('refresh-token');

    const result = await service.login({
      id: 7,
      email: 'user@example.com',
      username: 'demo',
      userRoles: [
        {
          role: {
            roleName: 'ADMIN',
            rolePermissions: [
              { permission: { permissionCode: 'USER_READ' } },
              { permission: { permissionCode: 'USER_READ' } },
              { permission: { permissionCode: 'USER_WRITE' } },
            ],
          },
        },
      ],
    });

    expect(setRequestContextValue).toHaveBeenCalledWith('userId', 7);
    expect(usersService.updateRefreshToken).toHaveBeenCalledWith(
      7,
      'refresh-token',
    );
    expect(usersService.updateLastLogin).toHaveBeenCalledWith(7);
    expect(result).toEqual({
      user: {
        id: 7,
        email: 'user@example.com',
        username: 'demo',
        roles: ['ADMIN'],
        permissions: ['USER_READ', 'USER_WRITE'],
      },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
  });

  it('throws UnauthorizedException when refresh token does not match', async () => {
    usersService.findById.mockResolvedValue({
      id: 9,
      refreshToken: 'stored-token',
      status: 'ACTIVE',
      isDeleted: false,
    });
    compareRefreshToken.mockReturnValue(false);

    await expectRejectWithStatus(service.refreshTokens(9, 'token'), 401);
  });

  it('creates forgot password request for active user', async () => {
    const nowSpy = jest
      .spyOn(Date, 'now')
      .mockReturnValue(new Date('2026-04-21T00:00:00Z').getTime());
    jest.spyOn(Math, 'random').mockReturnValue(0.123456);
    uuidv4.mockReturnValue('uuid-123');
    hashResetPasswordToken.mockReturnValue('hashed-otp');

    usersService.findByEmail.mockResolvedValue({
      id: 15,
      email: 'employee@example.com',
      username: 'employee',
      status: 'ACTIVE',
      isDeleted: false,
    });

    const result = await service.forgotPassword('employee@example.com');

    expect(usersService.update).toHaveBeenCalledWith(15, {
      otp: 'hashed-otp',
      otpExpiresAt: new Date('2026-04-21T00:05:00.000Z'),
      otpRequestId: 'uuid-123',
    });
    expect(mailService.sendResetPasswordEmail).toHaveBeenCalledWith(
      'employee@example.com',
      'employee',
      'https://frontend.example.com/forgot-password?requestId=uuid-123&otp=123456',
    );
    expect(result).toEqual({
      message: 'OTP đã được gửi đến email của bạn',
      otpRequestId: 'uuid-123',
    });

    nowSpy.mockRestore();
  });

  it('resets password with valid OTP', async () => {
    hashResetPasswordToken.mockReturnValue('hashed-otp');
    comparePassword.mockResolvedValue(false);
    usersService.findByOtpRequestId.mockResolvedValue({
      id: 21,
      email: 'employee@example.com',
      status: 'ACTIVE',
      isDeleted: false,
      otp: 'hashed-otp',
      otpExpiresAt: new Date('2026-04-22T00:00:00Z'),
    });
    usersService.findByIdWithPassword.mockResolvedValue({
      id: 21,
      password: 'old-password-hash',
    });

    const result = await service.resetPasswordWithOtp(
      'request-1',
      '123456',
      'NewPassword123!',
    );

    expect(usersService.update).toHaveBeenCalledWith(21, {
      password: 'NewPassword123!',
      otp: null,
      otpExpiresAt: null,
      otpRequestId: null,
      mustChangePassword: false,
    });
    expect(result).toEqual({ message: 'Mật khẩu đã được đặt lại thành công' });
  });
});
import 'reflect-metadata';
import * as jwt from 'jsonwebtoken';
import { AuthService } from '../auth.service.js';
import { UsersService } from '../users.service.js';
import { RedisService } from '../redis.service.js';
import { MailService } from '../mail.service.js';
import { AppDataSource } from '../../database/data-source.js';
import {
  comparePassword,
  compareRefreshToken,
  hashPassword,
  hashResetPasswordToken,
} from '../../common/utils/index.js';
import { setRequestContextValue } from '../../common/context/request-context.js';
import { v4 as uuidv4 } from 'uuid';

jest.mock('../users.service.js', () => ({
  UsersService: jest.fn(),
}));

jest.mock('../redis.service.js', () => ({
  RedisService: jest.fn(),
}));

jest.mock('../mail.service.js', () => ({
  MailService: jest.fn(),
}));

jest.mock('../../database/data-source.js', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock('../../common/utils/index.js', () => ({
  comparePassword: jest.fn(),
  compareRefreshToken: jest.fn(),
  hashPassword: jest.fn(),
  hashResetPasswordToken: jest.fn(),
}));

jest.mock('../../common/context/request-context.js', () => ({
  setRequestContextValue: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
}));

describe('AuthService', () => {
  let service;
  let usersService;
  let cacheService;
  let mailService;
  let employeeRepo;

  beforeEach(() => {
    jest.clearAllMocks();

    process.env.JWT_SECRET = 'access-secret';
    process.env.JWT_REFRESH_SECRET = 'refresh-secret';
    process.env.JWT_EXPIRES_IN = '15m';
    process.env.JWT_REFRESH_EXPIRES_IN = '7d';

    usersService = {
      findByEmailWithPassword: jest.fn(),
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByIdWithPassword: jest.fn(),
      findByOtpRequestId: jest.fn(),
      updateRefreshToken: jest.fn(),
      updateLastLogin: jest.fn(),
      update: jest.fn(),
    };

    cacheService = {};
    mailService = {
      sendResetPasswordEmail: jest.fn(),
    };
    employeeRepo = {
      findOne: jest.fn(),
    };

    UsersService.mockImplementation(() => usersService);
    RedisService.mockImplementation(() => cacheService);
    MailService.mockImplementation(() => mailService);
    AppDataSource.getRepository.mockReturnValue(employeeRepo);

    jwt.sign.mockImplementation(
      (payload, secret) => `${secret}:${payload.sub}`,
    );
    comparePassword.mockResolvedValue(true);
    compareRefreshToken.mockReturnValue(true);
    hashPassword.mockResolvedValue('hashed-password');
    hashResetPasswordToken.mockReturnValue('hashed-otp');
    uuidv4.mockReturnValue('request-id-123');

    service = new AuthService();
  });

  it('returns null when validating a missing user', async () => {
    usersService.findByEmailWithPassword.mockResolvedValue(null);

    const result = await service.validateUser('missing@example.com', 'pass');

    expect(result).toBeNull();
  });

  it('returns tokens and updates user state on login', async () => {
    const generateTokensSpy = jest
      .spyOn(service, 'generateTokens')
      .mockResolvedValue({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

    const result = await service.login({
      id: 7,
      email: 'user@example.com',
      username: 'user',
      userRoles: [
        {
          role: {
            roleName: 'ADMIN',
            rolePermissions: [
              { permission: { permissionCode: 'EMPLOYEE_READ' } },
              { permission: { permissionCode: 'EMPLOYEE_READ' } },
            ],
          },
        },
      ],
    });

    expect(setRequestContextValue).toHaveBeenCalledWith('userId', 7);
    expect(usersService.updateRefreshToken).toHaveBeenCalledWith(
      7,
      'refresh-token',
    );
    expect(usersService.updateLastLogin).toHaveBeenCalledWith(7);
    expect(result.user.roles).toEqual(['ADMIN']);
    expect(result.user.permissions).toEqual(['EMPLOYEE_READ']);
    expect(result.accessToken).toBe('access-token');
    expect(generateTokensSpy).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
    );
  });

  it('rejects refresh token requests with a mismatched token', async () => {
    usersService.findById.mockResolvedValue({
      id: 8,
      refreshToken: 'stored-hash',
      status: 'ACTIVE',
      isDeleted: false,
    });
    compareRefreshToken.mockReturnValue(false);

    await expect(
      service.refreshTokens(8, 'incoming-token'),
    ).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('changes password after validating the current password', async () => {
    usersService.findByIdWithPassword.mockResolvedValue({
      id: 9,
      password: 'old-hash',
    });
    comparePassword.mockResolvedValueOnce(true);

    const result = await service.changePassword(9, {
      currentPassword: 'old-pass',
      newPassword: 'new-pass',
    });

    expect(hashPassword).toHaveBeenCalledWith('new-pass');
    expect(usersService.update).toHaveBeenCalledWith(9, {
      password: 'new-pass',
    });
    expect(result).toEqual({ message: 'Đổi mật khẩu thành công' });
  });

  it('creates a new OTP reset request and sends email', async () => {
    usersService.findByEmail.mockResolvedValue({
      id: 11,
      email: 'alice@example.com',
      username: 'alice',
      status: 'ACTIVE',
      isDeleted: false,
    });
    usersService.update.mockResolvedValue({ id: 11 });

    const cryptoModule = await import('crypto');
    jest.spyOn(cryptoModule.default, 'randomInt').mockReturnValue(123456);

    const result = await service.forgotPassword('alice@example.com');

    expect(usersService.update).toHaveBeenCalledWith(11, {
      otp: 'hashed-otp',
      otpExpiresAt: expect.any(Date),
      otpRequestId: 'request-id-123',
    });
    expect(mailService.sendResetPasswordEmail).toHaveBeenCalledWith(
      'alice@example.com',
      'alice',
      expect.stringContaining('requestId=request-id-123'),
    );
    expect(result).toEqual({
      message: 'OTP đã được gửi đến email của bạn',
      otpRequestId: 'request-id-123',
    });
  });

  it('resets password with otp when the token is valid', async () => {
    usersService.findByOtpRequestId.mockResolvedValue({
      id: 12,
      status: 'ACTIVE',
      isDeleted: false,
      otp: 'hashed-otp',
      otpExpiresAt: new Date(Date.now() + 60_000),
    });
    usersService.findByIdWithPassword.mockResolvedValue({
      id: 12,
      password: 'current-hash',
    });
    comparePassword.mockResolvedValue(false);

    const result = await service.resetPasswordWithOtp(
      'request-id-123',
      '123456',
      'brand-new-pass',
    );

    expect(usersService.update).toHaveBeenCalledWith(12, {
      password: 'brand-new-pass',
      otp: null,
      otpExpiresAt: null,
      otpRequestId: null,
      mustChangePassword: false,
    });
    expect(result).toEqual({ message: 'Mật khẩu đã được đặt lại thành công' });
  });
});
