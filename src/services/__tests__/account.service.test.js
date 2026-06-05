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

  it('should throw "Định dạng email cá nhân không hợp lệ" if personalEmail is invalid', async () => {
    await expect(
      authService.editProfile(userId, { personalEmail: 'invalid' }),
    ).rejects.toThrow('Định dạng email cá nhân không hợp lệ');
  });

  it('should throw "Định dạng số điện thoại không hợp lệ" if phoneNumber is invalid', async () => {
    await expect(
      authService.editProfile(userId, { phoneNumber: '123' }),
    ).rejects.toThrow('Định dạng số điện thoại không hợp lệ');
  });

  it('should throw "Địa chỉ hiện tại không được vượt quá 500 ký tự" if currentAddress is too long', async () => {
    await expect(
      authService.editProfile(userId, { currentAddress: 'a'.repeat(501) }),
    ).rejects.toThrow('Địa chỉ hiện tại không được vượt quá 500 ký tự');
  });

  it('should throw "Địa chỉ thường trú không được vượt quá 500 ký tự" if permanentAddress is too long', async () => {
    await expect(
      authService.editProfile(userId, { permanentAddress: 'a'.repeat(501) }),
    ).rejects.toThrow('Địa chỉ thường trú không được vượt quá 500 ký tự');
  });

  it('should throw "Không tìm thấy hồ sơ" if employee profile is not found', async () => {
    AppDataSource.getRepository.mockReturnValue({
      findOne: jest.fn().mockResolvedValue(null),
    });

    await expect(authService.editProfile(userId, {})).rejects.toThrow('Không tìm thấy hồ sơ');
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

  describe('changePassword', () => {
    const userId = 1;
    const currentPassword = 'OldPassword@123';
    const newPassword = 'NewPassword@123';
    const invalidPassword = 'weak';

    it('should throw "Mật khẩu hiện tại không được để trống" if currentPassword is missing', async () => {
      await expect(
        authService.changePassword(userId, { newPassword }),
      ).rejects.toThrow('Mật khẩu hiện tại không được để trống');
    });

    it('should throw "Mật khẩu hiện tại không hợp lệ" if currentPassword format is invalid', async () => {
      await expect(
        authService.changePassword(userId, {
          currentPassword: invalidPassword,
          newPassword,
        }),
      ).rejects.toThrow('Mật khẩu hiện tại không hợp lệ');
    });

    it('should throw "Mật khẩu mới không được để trống" if newPassword is missing', async () => {
      await expect(
        authService.changePassword(userId, { currentPassword }),
      ).rejects.toThrow('Mật khẩu mới không được để trống');
    });

    it('should throw "Mật khẩu mới không hợp lệ" if newPassword format is invalid', async () => {
      await expect(
        authService.changePassword(userId, {
          currentPassword,
          newPassword: invalidPassword,
        }),
      ).rejects.toThrow('Mật khẩu mới không hợp lệ');
    });

    it('should throw "Không tìm thấy tài khoản" if user is not found', async () => {
      mockUserRepo.findByIdWithPassword.mockResolvedValue(null);
      await expect(
        authService.changePassword(userId, { currentPassword, newPassword }),
      ).rejects.toThrow('Không tìm thấy tài khoản');
    });

    it('should throw "Mật khẩu hiện tại không chính xác" if current password is incorrect', async () => {
      mockUserRepo.findByIdWithPassword.mockResolvedValue({
        id: userId,
        password: 'hashed-old-password',
      });
      comparePassword.mockResolvedValue(false);
      await expect(
        authService.changePassword(userId, { currentPassword, newPassword }),
      ).rejects.toThrow('Mật khẩu hiện tại không chính xác');
    });

    it('should throw "Mật khẩu mới không được trùng với mật khẩu cũ" if new password is same as current password', async () => {
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
      ).rejects.toThrow('Mật khẩu mới không được trùng với mật khẩu cũ');
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
