import 'reflect-metadata';
import { UsersService } from '../users.service.js';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '../../common/exceptions/index.js';

jest.mock('../../common/utils/index.js', () => ({
  hashPassword: jest.fn(),
  hashResetPasswordToken: jest.fn(),
}));

jest.mock('../../database/data-source.js', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

jest.mock('crypto', () => ({
  randomInt: jest.fn(),
}));

jest.mock('../mail.service.js', () => ({
  MailService: jest.fn().mockImplementation(() => ({
    AdminResetPasswordEmail: jest.fn(),
  })),
}));

jest.mock('../../config/env.config.js', () => ({
  config: {
    frontEndUrl: 'http://localhost:3000',
  },
}));

import { hashPassword } from '../../common/utils/index.js';

describe('UsersService - create', () => {
  let usersService;
  let mockUsersRepo;
  let mockRolesRepo;
  let mockUserRoleRepo;
  let mockMailService;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUsersRepo = {
      findByEmail: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      countActiveAdmins: jest.fn(),
    };
    mockRolesRepo = {
      findByIds: jest.fn(),
      findById: jest.fn(),
    };
    mockUserRoleRepo = {
      bulkCreate: jest.fn(),
    };
    mockMailService = {
        AdminResetPasswordEmail: jest.fn(),
    };

    usersService = new UsersService(
      mockUsersRepo,
      mockRolesRepo,
      mockUserRoleRepo,
      mockMailService,
    );
  });

  const validDto = {
    email: 'test@example.com',
    username: 'testuser',
    password: 'Password@123',
    roleIds: [1, 2],
    status: 'ACTIVE',
  };

  describe('Manual Validation', () => {
    it('should throw "Email không được để trống" if email is missing', async () => {
      await expect(usersService.create({ ...validDto, email: '' })).rejects.toThrow('Email không được để trống');
    });

    it('should throw "Email không hợp lệ" if email is invalid', async () => {
      await expect(
        usersService.create({ ...validDto, email: 'invalid' }),
      ).rejects.toThrow('Email không hợp lệ');
    });

    it('should throw "Tên đăng nhập không được để trống" if username is missing', async () => {
      await expect(
        usersService.create({ ...validDto, username: '' }),
      ).rejects.toThrow('Tên đăng nhập không được để trống');
    });

    it('should throw "Tên đăng nhập không được vượt quá 50 ký tự" if username is too long', async () => {
      await expect(
        usersService.create({ ...validDto, username: 'a'.repeat(51) }),
      ).rejects.toThrow('Tên đăng nhập không được vượt quá 50 ký tự');
    });

    it('should throw "Mật khẩu không được để trống" if password is missing', async () => {
      await expect(
        usersService.create({ ...validDto, password: '' }),
      ).rejects.toThrow('Mật khẩu không được để trống');
    });

    it('should throw "Mật khẩu phải chứa ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt" if password is weak', async () => {
      await expect(
        usersService.create({ ...validDto, password: 'simplepassword' }),
      ).rejects.toThrow('Mật khẩu phải chứa ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt');
    });

    it('should throw "Danh sách vai trò không hợp lệ" if roleIds is not an array', async () => {
      await expect(
        usersService.create({ ...validDto, roleIds: 'not-an-array' }),
      ).rejects.toThrow('Danh sách vai trò không hợp lệ');
    });

    it('should throw "Trạng thái không hợp lệ" if status is too long', async () => {
      await expect(
        usersService.create({ ...validDto, status: 'a'.repeat(21) }),
      ).rejects.toThrow('Trạng thái không hợp lệ');
    });
  });

  describe('Business Logic', () => {
    it('should throw "Email đã tồn tại" if email already exists', async () => {
      mockUsersRepo.findByEmail.mockResolvedValue({ id: 1 });

      await expect(usersService.create(validDto)).rejects.toThrow('Email đã tồn tại');
    });

    it('should throw "Tên đăng nhập đã tồn tại" if username already exists', async () => {
      mockUsersRepo.findByEmail.mockResolvedValue(null);
      mockUsersRepo.findOne.mockResolvedValue({ id: 1 });
      await expect(usersService.create(validDto)).rejects.toThrow('Tên đăng nhập đã tồn tại');
    });

    it('should throw "Không thể gán vai trò admin" if trying to assign ADMIN role', async () => {
      mockUsersRepo.findByEmail.mockResolvedValue(null);
      mockUsersRepo.findOne.mockResolvedValue(null);
      mockRolesRepo.findByIds.mockResolvedValue([{ id: 1, roleName: 'ADMIN' }]);
      await expect(usersService.create(validDto)).rejects.toThrow('Không thể gán vai trò admin');
    });

    it('should throw "Không tìm thấy người dùng" if some roles are not found', async () => {
      mockUsersRepo.findByEmail.mockResolvedValue(null);
      mockUsersRepo.findOne.mockResolvedValue(null);
      mockRolesRepo.findByIds.mockResolvedValue([{ id: 1, roleName: 'USER' }]); // Only 1 found but 2 requested
      await expect(usersService.create(validDto)).rejects.toThrow('Không tìm thấy người dùng');
    });

    it('should create user and assign roles on success', async () => {
      mockUsersRepo.findByEmail.mockResolvedValue(null);
      mockUsersRepo.findOne.mockResolvedValue(null);
      mockRolesRepo.findByIds.mockResolvedValue([
        { id: 1, roleName: 'USER' },
        { id: 2, roleName: 'MANAGER' },
      ]);
      hashPassword.mockResolvedValue('hashed-password');
      mockUsersRepo.create.mockResolvedValue({ id: 10, ...validDto });

      const result = await usersService.create(validDto);

      expect(hashPassword).toHaveBeenCalledWith(validDto.password);
      expect(mockUsersRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: validDto.email,
          username: validDto.username,
          password: 'hashed-password',
        }),
      );
      expect(mockUserRoleRepo.bulkCreate).toHaveBeenCalled();
      expect(result.id).toBe(10);
    });

    it('should create user without roles if roleIds is empty', async () => {
        mockUsersRepo.findByEmail.mockResolvedValue(null);
        mockUsersRepo.findOne.mockResolvedValue(null);
        hashPassword.mockResolvedValue('hashed-password');
        mockUsersRepo.create.mockResolvedValue({ id: 10, ...validDto });
  
        await usersService.create({ ...validDto, roleIds: [] });
  
        expect(mockUserRoleRepo.bulkCreate).not.toHaveBeenCalled();
      });
  });
});

describe('UsersService - update', () => {
  let usersService;
  let mockUsersRepo;
  let mockRolesRepo;
  let mockUserRoleRepo;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUsersRepo = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };
    mockRolesRepo = {
      findById: jest.fn(),
    };
    mockUserRoleRepo = {
      deleteByUserId: jest.fn(),
      bulkCreate: jest.fn(),
    };

    usersService = new UsersService(
      mockUsersRepo,
      mockRolesRepo,
      mockUserRoleRepo,
    );
  });

  const userId = 1;
  const updateDto = {
    email: 'updated@example.com',
    username: 'updateduser',
    status: 'ACTIVE',
    roleIds: [2],
  };

  const existingUser = {
    id: userId,
    email: 'old@example.com',
    username: 'olduser',
    status: 'ACTIVE',
  };

  describe('Manual Validation', () => {
    it('should throw "Email không hợp lệ" if email is invalid', async () => {
      await expect(
        usersService.update(userId, { email: 'invalid' }),
      ).rejects.toThrow('Email không hợp lệ');
    });

    it('should throw "Tên đăng nhập không được vượt quá 50 ký tự" if username is too long', async () => {
      await expect(
        usersService.update(userId, { username: 'a'.repeat(51) }),
      ).rejects.toThrow('Tên đăng nhập không được vượt quá 50 ký tự');
    });

    it('should throw "Danh sách vai trò không hợp lệ" if roleIds is not an array', async () => {
      await expect(
        usersService.update(userId, { roleIds: 'not-an-array' }),
      ).rejects.toThrow('Danh sách vai trò không hợp lệ');
    });

    it('should throw "Trạng thái không hợp lệ" if status is too long', async () => {
      await expect(
        usersService.update(userId, { status: 'a'.repeat(21) }),
      ).rejects.toThrow('Trạng thái không hợp lệ');
    });
  });

  describe('Business Logic', () => {
    it('should throw "Không tìm thấy người dùng" if user to update does not exist', async () => {
      mockUsersRepo.findById.mockResolvedValue(null);
      // findById itself throws NotFoundException if user is null
      // Actually, looking at findById implementation:
      /*
      async findById(id) {
        const user = await this.usersRepository.findById(id);
        if (!user) {
          throw new NotFoundException(AppMessages.Errors.User.NOT_FOUND);
        }
        return user;
      }
      */
      // So I need to mock usersRepository.findById
      mockUsersRepo.findById.mockResolvedValue(null);

      await expect(usersService.update(userId, updateDto)).rejects.toThrow(
        'Không tìm thấy người dùng',
      );
    });

    it('should throw "Email đã tồn tại" if updated email already exists', async () => {
      mockUsersRepo.findById.mockResolvedValue(existingUser);
      mockUsersRepo.findByEmail.mockResolvedValue({ id: 2, email: updateDto.email });
      await expect(usersService.update(userId, updateDto)).rejects.toThrow(
        'Email đã tồn tại',
      );
    });

    it('should throw "Tên đăng nhập đã tồn tại" if updated username already exists', async () => {
      mockUsersRepo.findById.mockResolvedValue(existingUser);
      mockUsersRepo.findByEmail.mockResolvedValue(null);
      mockUsersRepo.findOne.mockResolvedValue({ id: 2, username: updateDto.username });
      await expect(usersService.update(userId, updateDto)).rejects.toThrow(
        'Tên đăng nhập đã tồn tại',
      );
    });

    it('should throw "Không tìm thấy vai trò" if role does not exist', async () => {
      mockUsersRepo.findById.mockResolvedValue(existingUser);
      mockUsersRepo.findByEmail.mockResolvedValue(null);
      mockUsersRepo.findOne.mockResolvedValue(null);
      mockRolesRepo.findById.mockResolvedValue(null);
      await expect(usersService.update(userId, updateDto)).rejects.toThrow(
        'Không tìm thấy vai trò',
      );
    });

    it('should throw "Không thể gán vai trò admin" if assigning ADMIN role', async () => {
      mockUsersRepo.findById.mockResolvedValue(existingUser);
      mockUsersRepo.findByEmail.mockResolvedValue(null);
      mockUsersRepo.findOne.mockResolvedValue(null);
      mockRolesRepo.findById.mockResolvedValue({ id: 2, roleName: 'ADMIN' });
      await expect(usersService.update(userId, updateDto)).rejects.toThrow(
        'Không thể gán vai trò admin',
      );
    });

    it('should update user information and roles on success', async () => {
      mockUsersRepo.findById.mockResolvedValue(existingUser);
      mockUsersRepo.findByEmail.mockResolvedValue(null);
      mockUsersRepo.findOne.mockResolvedValue(null);
      mockRolesRepo.findById.mockResolvedValue({ id: 2, roleName: 'USER' });

      const result = await usersService.update(userId, updateDto);

      expect(mockUsersRepo.update).toHaveBeenCalledWith(userId, expect.any(Object));
      expect(mockUserRoleRepo.deleteByUserId).toHaveBeenCalledWith(userId);
      expect(mockUserRoleRepo.bulkCreate).toHaveBeenCalled();
      expect(result).toEqual(existingUser);
    });

    it('should update user information without roles if roleIds not provided', async () => {
      const { roleIds, ...dtoWithoutRoles } = updateDto;
      mockUsersRepo.findById.mockResolvedValue(existingUser);
      mockUsersRepo.findByEmail.mockResolvedValue(null);
      mockUsersRepo.findOne.mockResolvedValue(null);

      await usersService.update(userId, dtoWithoutRoles);

      expect(mockUsersRepo.update).toHaveBeenCalled();
      expect(mockUserRoleRepo.deleteByUserId).not.toHaveBeenCalled();
    });
  });
});
