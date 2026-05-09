import 'reflect-metadata';
import { AuthService } from '../auth.service.js';
import {
  BadRequestException,
  NotFoundException,
} from '../../common/exceptions/index.js';
import { AppDataSource } from '../../database/data-source.js';

const mockUpdate = jest.fn();
const mockLogCreate = jest.fn();

import {
  comparePassword,
  hashPassword,
} from '../../common/utils/index.js';

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
  ActionLogsRepository: jest.fn().mockImplementation(() => ({
    create: mockLogCreate,
  })),
}));

jest.mock('../../repositories/employees.repository.js', () => ({
  EmployeesRepository: jest.fn().mockImplementation(() => ({
    update: mockUpdate,
  })),
}));

jest.mock('../mail.service.js', () => ({
  MailService: jest.fn(),
}));

jest.mock('../../config/env.config.js', () => ({
  config: {
    frontEndUrl: 'http://localhost:3000',
  },
}));

describe('AuthService - editProfile', () => {
  let authService;
  let mockUserRepo;
  let mockMailService;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUserRepo = {
      findByIdWithPassword: jest.fn(),
      update: jest.fn(),
    };
    mockMailService = {};
    authService = new AuthService(mockMailService, mockUserRepo);
  });

  const userId = 1;
  const mockEmployee = {
    id: 10,
    userId: userId,
    fullName: 'Test User',
    personalEmail: 'old@example.com',
    phoneNumber: '0987654321',
    currentAddress: 'Old Address',
    permanentAddress: 'Old Perm Address',
    avatar: 'old-avatar.jpg',
  };

  it('should throw BadRequestException if personalEmail is invalid', async () => {
    await expect(
      authService.editProfile(userId, { personalEmail: 'invalid' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if phoneNumber is invalid', async () => {
    await expect(
      authService.editProfile(userId, { phoneNumber: '123' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if currentAddress is too long', async () => {
    await expect(
      authService.editProfile(userId, { currentAddress: 'a'.repeat(501) }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if permanentAddress is too long', async () => {
    await expect(
      authService.editProfile(userId, { permanentAddress: 'a'.repeat(501) }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw NotFoundException if employee profile is not found', async () => {
    AppDataSource.getRepository.mockReturnValue({
      findOne: jest.fn().mockResolvedValue(null),
    });

    await expect(authService.editProfile(userId, {})).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should update profile and log action when fields change', async () => {
    AppDataSource.getRepository.mockReturnValue({
      findOne: jest.fn().mockResolvedValue(mockEmployee),
    });

    const updateDto = {
      personalEmail: 'new@example.com',
      phoneNumber: '0912345678',
    };

    mockUpdate.mockResolvedValue({ ...mockEmployee, ...updateDto });

    const result = await authService.editProfile(userId, updateDto);

    expect(mockUpdate).toHaveBeenCalledWith(mockEmployee.id, updateDto);
    expect(mockLogCreate).toHaveBeenCalled();
    expect(result.personalEmail).toBe(updateDto.personalEmail);
  });

  it('should update profile but not log action when no fields change', async () => {
    AppDataSource.getRepository.mockReturnValue({
      findOne: jest.fn().mockResolvedValue(mockEmployee),
    });

    const updateDto = {
      personalEmail: mockEmployee.personalEmail,
      phoneNumber: mockEmployee.phoneNumber,
      currentAddress: mockEmployee.currentAddress,
      permanentAddress: mockEmployee.permanentAddress,
      avatar: mockEmployee.avatar,
    };

    mockUpdate.mockResolvedValue(mockEmployee);

    await authService.editProfile(userId, updateDto);

    expect(mockUpdate).toHaveBeenCalled();
    expect(mockLogCreate).not.toHaveBeenCalled();
  });

  it('should not throw error if action logging fails', async () => {
    AppDataSource.getRepository.mockReturnValue({
      findOne: jest.fn().mockResolvedValue(mockEmployee),
    });

    mockUpdate.mockResolvedValue(mockEmployee);
    mockLogCreate.mockRejectedValue(new Error('Log failed'));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    await authService.editProfile(userId, { personalEmail: 'new@email.com' });

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to log action:',
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });

  describe('changePassword', () => {
    const userId = 1;
    const currentPassword = 'OldPassword@123';
    const newPassword = 'NewPassword@123';
    const invalidPassword = 'weak';

    it('should throw BadRequestException if currentPassword is missing', async () => {
      await expect(
        authService.changePassword(userId, { newPassword }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if currentPassword format is invalid', async () => {
      await expect(
        authService.changePassword(userId, {
          currentPassword: invalidPassword,
          newPassword,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if newPassword is missing', async () => {
      await expect(
        authService.changePassword(userId, { currentPassword }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if newPassword format is invalid', async () => {
      await expect(
        authService.changePassword(userId, {
          currentPassword,
          newPassword: invalidPassword,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if user is not found', async () => {
      mockUserRepo.findByIdWithPassword.mockResolvedValue(null);

      await expect(
        authService.changePassword(userId, { currentPassword, newPassword }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if current password is incorrect', async () => {
      mockUserRepo.findByIdWithPassword.mockResolvedValue({
        id: userId,
        password: 'hashed-old-password',
      });
      comparePassword.mockResolvedValue(false);

      await expect(
        authService.changePassword(userId, { currentPassword, newPassword }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if new password is same as current password', async () => {
      mockUserRepo.findByIdWithPassword.mockResolvedValue({
        id: userId,
        password: 'hashed-old-password',
      });
      comparePassword.mockResolvedValue(true);

      await expect(
        authService.changePassword(userId, {
          currentPassword,
          newPassword: currentPassword,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update password on success', async () => {
      mockUserRepo.findByIdWithPassword.mockResolvedValue({
        id: userId,
        password: 'hashed-old-password',
      });
      comparePassword.mockResolvedValue(true);
      hashPassword.mockResolvedValue('hashed-new-password');

      const result = await authService.changePassword(userId, {
        currentPassword,
        newPassword,
      });

      expect(mockUserRepo.update).toHaveBeenCalledWith(userId, {
        password: 'hashed-new-password',
      });
      expect(result).toEqual({ message: 'Đổi mật khẩu thành công' });
    });
  });
});
