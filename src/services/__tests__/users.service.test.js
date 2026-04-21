import { UsersService } from '../users.service.js';
import {
  hashPassword,
  hashResetPasswordToken,
} from '../../common/utils/index.js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

jest.mock('../../common/utils/index.js', () => ({
  hashPassword: jest.fn(),
  hashResetPasswordToken: jest.fn(),
}));

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

jest.mock('../../config/env.config.js', () => ({
  config: {
    frontEndUrl: 'https://frontend.example.com',
  },
}));

describe('UsersService', () => {
  let service;
  let usersRepository;
  let rolesRepository;
  let userRoleRepository;
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

    usersRepository = {
      findByEmail: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
      findByEmailWithPasswordBuilder: jest.fn(),
      findByIdWithPassword: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      lockUser: jest.fn(),
      unlockUser: jest.fn(),
      updateRefreshToken: jest.fn(),
      updateLastLogin: jest.fn(),
      countActiveAdmins: jest.fn(),
    };

    rolesRepository = {
      findByIds: jest.fn(),
      findById: jest.fn(),
    };

    userRoleRepository = {
      bulkCreate: jest.fn(),
      deleteByUserId: jest.fn(),
    };

    mailService = {
      AdminResetPasswordEmail: jest.fn(),
    };

    service = new UsersService(
      usersRepository,
      rolesRepository,
      userRoleRepository,
      {},
      mailService,
    );
  });

  it('throws ConflictException when creating user with duplicate email', async () => {
    usersRepository.findByEmail.mockResolvedValue({ id: 1 });

    await expectRejectWithStatus(
      service.create({
        email: 'existing@example.com',
        username: 'new-user',
        password: 'Secret123!',
      }),
      409,
    );

    expect(usersRepository.create).not.toHaveBeenCalled();
  });

  it('creates user and assigns roles', async () => {
    usersRepository.findByEmail.mockResolvedValue(null);
    usersRepository.findOne.mockResolvedValue(null);
    rolesRepository.findByIds.mockResolvedValue([11, 22]);
    hashPassword.mockResolvedValue('hashed-password');
    usersRepository.create.mockResolvedValue({
      id: 50,
      email: 'user@example.com',
    });

    const result = await service.create({
      email: 'user@example.com',
      username: 'user1',
      password: 'Secret123!',
      roleIds: [11, 22],
    });

    expect(hashPassword).toHaveBeenCalledWith('Secret123!');
    expect(usersRepository.create).toHaveBeenCalledWith({
      email: 'user@example.com',
      username: 'user1',
      password: 'hashed-password',
      status: 'ACTIVE',
    });
    expect(userRoleRepository.bulkCreate).toHaveBeenCalledWith([
      { userId: 50, roleId: 11 },
      { userId: 50, roleId: 22 },
    ]);
    expect(result).toEqual({ id: 50, email: 'user@example.com' });
  });

  it('throws NotFoundException when updating with a missing role', async () => {
    usersRepository.findById.mockResolvedValue({
      id: 9,
      email: 'user@example.com',
      username: 'user1',
    });
    rolesRepository.findById.mockResolvedValue(null);

    await expectRejectWithStatus(
      service.update(9, {
        roleIds: [77],
      }),
      404,
    );
    expect(usersRepository.update).not.toHaveBeenCalled();
  });

  it('updates password and replaces roles', async () => {
    usersRepository.findById.mockResolvedValue({
      id: 9,
      email: 'user@example.com',
      username: 'user1',
      userRoles: [],
    });
    rolesRepository.findById.mockResolvedValue({ id: 31 });
    hashPassword.mockResolvedValue('hashed-new-password');

    const result = await service.update(9, {
      password: 'NewSecret123!',
      roleIds: [31],
      fullName: 'Ignored',
    });

    expect(hashPassword).toHaveBeenCalledWith('NewSecret123!');
    expect(usersRepository.update).toHaveBeenCalledWith(9, {
      password: 'hashed-new-password',
    });
    expect(userRoleRepository.deleteByUserId).toHaveBeenCalledWith(9);
    expect(userRoleRepository.bulkCreate).toHaveBeenCalledWith([
      { userId: 9, roleId: 31 },
    ]);
    expect(result).toEqual({
      id: 9,
      email: 'user@example.com',
      username: 'user1',
      userRoles: [],
    });
  });

  it('prevents deleting the current user', async () => {
    usersRepository.findById.mockResolvedValue({
      id: 3,
      userRoles: [],
    });

    await expectRejectWithStatus(service.remove(3, 3), 403);
    expect(usersRepository.delete).not.toHaveBeenCalled();
  });

  it('creates admin reset password request', async () => {
    usersRepository.findById.mockResolvedValue({
      id: 20,
      email: 'admin@example.com',
      username: 'admin',
      userRoles: [],
      status: 'INACTIVE',
    });
    hashResetPasswordToken.mockReturnValue('hashed-otp');
    uuidv4.mockReturnValue('uuid-otp');
    jest.spyOn(crypto, 'randomInt').mockReturnValue(654321);

    const result = await service.resetPassword(20, 1);

    expect(usersRepository.update).toHaveBeenCalledWith(20, {
      otp: 'hashed-otp',
      otpRequestId: 'uuid-otp',
      mustChangePassword: true,
    });
    expect(mailService.AdminResetPasswordEmail).toHaveBeenCalledWith(
      'admin@example.com',
      'admin',
      'https://frontend.example.com/forgot-password?requestId=uuid-otp&otp=654321',
    );
    expect(result).toEqual({
      message: 'OTP đã được gửi đến email của nhân viên',
      otpRequestId: 'uuid-otp',
    });
  });
});
