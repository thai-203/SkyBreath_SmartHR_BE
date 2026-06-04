import crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { AppMessages } from '../common/constants/index.js';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '../common/exceptions/index.js';
import {
  comparePassword,
  compareRefreshToken,
  hashPassword,
  hashResetPasswordToken,
} from '../common/utils/index.js';
import { config } from '../config/env.config.js';
import { AppDataSource } from '../database/data-source.js';
import { EmployeeEntity } from '../models/entities/employee.entity.js';
import { ActionLogsRepository } from '../repositories/action-logs.repository.js';
import { EmployeesRepository } from '../repositories/employees.repository.js';
import { MailService } from './mail.service.js';
import { setRequestContextValue } from '../common/context/request-context.js';
import { isEmail, matches } from 'class-validator';
import { UsersRepository } from '../repositories/users.repository.js';
export class AuthService {
  constructor(
    mailServiceInstance = new MailService(),
    userRepository = new UsersRepository(),
  ) {
    this.mailService = mailServiceInstance;
    this.userRepository = userRepository;
  }

  async _validateUser(email, password) {
    if (!email) {
      throw new BadRequestException(AppMessages.Errors.Auth.EMAIL_REQUIRED);
    }
    if (!password) {
      throw new BadRequestException(AppMessages.Errors.Auth.PASSWORD_REQUIRED);
    }
    if (!isEmail(email)) {
      throw new BadRequestException(AppMessages.Errors.Auth.INVALID_EMAIL);
    }
    if (
      !matches(
        password,
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      )
    ) {
      throw new BadRequestException(AppMessages.Errors.Auth.INVALID_PASSWORD);
    }
    const user =
      await this.userRepository.findByEmailWithPasswordBuilder(email);

    if (!user) {
      return null;
    }

    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    if (user.status === 'LOCKED') {
      throw new UnauthorizedException(AppMessages.Errors.Auth.ACCOUNT_LOCKED);
    }

    if (user.status === 'INACTIVE') {
      throw new UnauthorizedException(AppMessages.Errors.Auth.ACCOUNT_INACTIVE);
    }

    if (user.mustChangePassword) {
      throw new UnauthorizedException(
        AppMessages.Errors.Auth.PASSWORD_CHANGE_REQUIRED,
      );
    }

    return user;
  }

  async login(email, password) {
    const user = await this._validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException(
        AppMessages.Errors.Auth.INVALID_CREDENTIALS,
      );
    }

    setRequestContextValue('userId', user.id);
    const tokens = await this.generateTokens(user);
    await this.userRepository.updateRefreshToken(user.id, tokens.refreshToken);
    await this.userRepository.updateLastLogin(user.id);
    const roles = user.userRoles?.map((ur) => ur.role.roleName) || [];
    const permissions = [
      ...new Set(
        user.userRoles?.flatMap((ur) =>
          ur.role.rolePermissions?.map((rp) => rp.permission.permissionCode),
        ) || [],
      ),
    ];
    return {
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        roles,
        permissions,
      },
      ...tokens,
    };
  }

  async refreshTokens(userId, refreshToken) {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new NotFoundException(AppMessages.Errors.Auth.ACCOUNT_NOT_FOUND);
    }

    if (
      !user.refreshToken ||
      !compareRefreshToken(user.refreshToken, refreshToken)
    ) {
      throw new UnauthorizedException(AppMessages.Errors.Auth.TOKEN_INVALID);
    }

    if (user.status === 'LOCKED') {
      throw new UnauthorizedException(AppMessages.Errors.Auth.ACCOUNT_LOCKED);
    }

    if (user.status === 'INACTIVE') {
      throw new UnauthorizedException(AppMessages.Errors.Auth.ACCOUNT_INACTIVE);
    }

    if (user.mustChangePassword) {
      throw new UnauthorizedException(
        AppMessages.Errors.Auth.PASSWORD_CHANGE_REQUIRED,
      );
    }

    const tokens = await this.generateTokens(user);
    await this.userRepository.updateRefreshToken(user.id, tokens.refreshToken);

    return tokens;
  }

  async logout(userId) {
    await this.userRepository.updateRefreshToken(userId, null);
    return;
  }

  async changePassword(userId, changePasswordDto) {
    const { currentPassword, newPassword } = changePasswordDto;

    if (!currentPassword) {
      throw new BadRequestException(
        AppMessages.Errors.Auth.PASSWORD_CURRENT_REQUIRED,
      );
    }
    if (
      !matches(
        currentPassword,
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      )
    ) {
      throw new BadRequestException(
        AppMessages.Errors.Auth.PASSWORD_CURRENT_INVALID,
      );
    }

    if (!newPassword) {
      throw new BadRequestException(
        AppMessages.Errors.Auth.PASSWORD_NEW_REQUIRED,
      );
    }
    if (
      !matches(
        newPassword,
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      )
    ) {
      throw new BadRequestException(
        AppMessages.Errors.Auth.PASSWORD_NEW_INVALID,
      );
    }

    const user = await this.userRepository.findByIdWithPassword(userId);

    if (!user) {
      throw new NotFoundException(AppMessages.Errors.Auth.ACCOUNT_NOT_FOUND);
    }

    const isPasswordValid = await comparePassword(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new BadRequestException(
        AppMessages.Errors.Auth.PASSWORD_CURRENT_MISMATCH,
      );
    }

    if (changePasswordDto.newPassword === changePasswordDto.currentPassword) {
      throw new BadRequestException(
        AppMessages.Errors.Auth.PASSWORD_NOT_DIFFERENT,
      );
    }

    const hashedPassword = await hashPassword(changePasswordDto.newPassword);
    await this.userRepository.update(userId, {
      password: hashedPassword,
    });

    return { message: 'Đổi mật khẩu thành công' };
  }

  async getProfile(userId) {
    const user = await this.userRepository.findById(userId);

    const employee = await AppDataSource.getRepository(EmployeeEntity).findOne({
      where: { userId: userId, isDeleted: false },
      relations: [
        'department',
        'position',
        'directManager',
        'jobGrade',
        'hrMentor',
      ],
    });

    let bankAccount = null;
    if (employee) {
      const { EmployeeBankAccountEntity } = await import('../models/entities/employee-bank-account.entity.js');
      const bankRepo = AppDataSource.getRepository(EmployeeBankAccountEntity);
      const activeBankAccount = await bankRepo.findOne({
        where: { employeeId: employee.id, status: 'ACTIVE' },
      });
      if (activeBankAccount) {
        bankAccount = {
          id: activeBankAccount.id,
          accountNumber: activeBankAccount.accountNumber,
          accountHolderName: activeBankAccount.accountHolderName,
          bankName: activeBankAccount.bankName,
          bankBranch: activeBankAccount.bankBranch,
        };
      }
    }

    return {
      // User account info
      id: user.id,
      username: user.username,
      email: user.email,
      companyEmail: employee?.companyEmail || null,
      roles: user.userRoles?.map((ur) => ur.role.roleName) || [],
      role: user.userRoles?.[0]?.role.roleName || null,
      status: user.status,

      // Personal info
      avatar: employee?.avatar || null,
      fullName: employee?.fullName || null,
      personalEmail: employee?.personalEmail || null,
      phoneNumber: employee?.phoneNumber || null,
      dateOfBirth: employee?.dateOfBirth || null,
      gender: employee?.gender || null,
      maritalStatus: employee?.maritalStatus || null,
      nationality: employee?.nationality || null,

      // Address info
      currentAddress: employee?.currentAddress || null,
      permanentAddress: employee?.permanentAddress || null,

      // Government IDs
      nationalId: employee?.nationalId || null,
      nationalIdIssuedDate: employee?.nationalIdIssuedDate || null,
      nationalIdIssuedPlace: employee?.nationalIdIssuedPlace || null,
      taxCode: employee?.taxCode || null,

      // Organization info
      department: employee?.department
        ? {
            id: employee.department.id,
            name: employee.department.departmentName,
          }
        : null,
      position: employee?.position
        ? {
            id: employee.position.id,
            name: employee.position.positionName,
          }
        : null,
      jobGrade: employee?.jobGrade
        ? {
            id: employee.jobGradeId,
            name: employee.jobGrade.gradeName,
          }
        : null,
      manager: employee?.directManager?.fullName || null,
      directManager: employee?.directManager
        ? {
            id: employee.directManager.id,
            name: employee.directManager.fullName,
          }
        : null,
      hrMentor: employee?.hrMentor?.fullName || null,
      employmentStatus: employee?.employmentStatus || null,
      joinDate: employee?.joinDate || null,
      bankAccount: bankAccount,

      // System info
      employeeId: employee?.id || null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginTime: user.lastLoginTime,
      permissions: [
        ...new Set(
          user.userRoles?.flatMap((ur) =>
            ur.role.rolePermissions?.map((rp) => rp.permission.permissionCode),
          ) || [],
        ),
      ],
    };
  }

  async editProfile(userId, updateProfileDto) {
    const { personalEmail, phoneNumber, currentAddress, permanentAddress } =
      updateProfileDto;

    if (personalEmail && !isEmail(personalEmail)) {
      throw new BadRequestException('Định dạng email cá nhân không hợp lệ');
    }
    if (phoneNumber && !/^(\+84|0)(3|5|7|8|9)\d{8}$/.test(phoneNumber)) {
      throw new BadRequestException('Định dạng số điện thoại không hợp lệ');
    }
    if (currentAddress && currentAddress.length > 500) {
      throw new BadRequestException(
        'Địa chỉ hiện tại không được vượt quá 500 ký tự',
      );
    }
    if (permanentAddress && permanentAddress.length > 500) {
      throw new BadRequestException(
        'Địa chỉ thường trú không được vượt quá 500 ký tự',
      );
    }

    const employeeRepo = new EmployeesRepository();
    const actionLogsRepo = new ActionLogsRepository();

    const employee = await AppDataSource.getRepository(EmployeeEntity).findOne({
      where: { userId: userId, isDeleted: false },
      relations: [
        'department',
        'position',
        'directManager',
        'jobGrade',
        'hrMentor',
      ],
    });

    if (!employee) {
      throw new NotFoundException(AppMessages.Errors.Auth.PROFILE_NOT_FOUND);
    }

    // Store previous data for audit logging
    const beforeData = {
      // fullName intentionally not part of editable data
      personalEmail: employee.personalEmail,
      phoneNumber: employee.phoneNumber,
      currentAddress: employee.currentAddress,
      permanentAddress: employee.permanentAddress,
      avatar: employee.avatar,
    };

    // Update employee
    const updated = await employeeRepo.update(employee.id, updateProfileDto);

    // Track changed fields
    const changedFields = [];
    Object.keys(beforeData).forEach((key) => {
      if (beforeData[key] !== updateProfileDto[key]) {
        changedFields.push(key);
      }
    });

    // Log action if there are changes
    if (changedFields.length > 0) {
      try {
        await actionLogsRepo.create({
          userId: userId,
          actionType: 'UPDATE',
          targetTable: 'employees',
          targetRecordId: employee.id,
          beforeData,
          afterData: updateProfileDto,
          changedFields,
          description: `Profile updated: ${changedFields.join(', ')}`,
        });
      } catch (error) {
        console.error('Failed to log action:', error);
        // Don't throw error, just log it
      }
    }

    return {
      id: updated.id,
      fullName: updated.fullName,
      avatar: updated.avatar,
      companyEmail: updated.companyEmail,
      personalEmail: updated.personalEmail,
      phoneNumber: updated.phoneNumber,
      currentAddress: updated.currentAddress,
      permanentAddress: updated.permanentAddress,
      department: updated.department
        ? {
            id: updated.department.id,
            name: updated.department.departmentName,
          }
        : null,
      position: updated.position
        ? {
            id: updated.position.id,
            name: updated.position.positionName,
          }
        : null,
      jobGrade: updated.jobGrade
        ? {
            id: updated.jobGrade.id,
            name: updated.jobGrade.name,
          }
        : null,
      manager: updated.directManager?.fullName || null,
      hrMentor: updated.hrMentor?.fullName || null,
    };
  }

  async generateTokens(user) {
    const roles = user.userRoles?.map((ur) => ur.role.roleName) || [];

    const permissions = [
      ...new Set(
        user.userRoles?.flatMap((ur) =>
          ur.role.rolePermissions?.map((rp) => rp.permission.permissionCode),
        ) || [],
      ),
    ];

    const accessTokenPayload = {
      sub: user.id,
      email: user.email,
      roles,
      permissions,
    };

    const refreshTokenPayload = {
      sub: user.id,
    };

    const secret = config.jwt.secret;
    const refreshSecret = config.jwt.refreshSecret;
    const expiresIn = config.jwt.expiresIn;
    const refreshExpiresIn = config.jwt.refreshExpiresIn;

    if (!secret || !refreshSecret) {
      throw new Error('Lỗi hệ thống, vui lòng thử lại sau');
    }

    const [accessToken, refreshToken] = await Promise.all([
      jwt.sign(accessTokenPayload, secret, { expiresIn: expiresIn }),
      jwt.sign(refreshTokenPayload, refreshSecret, {
        expiresIn: refreshExpiresIn,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  // ── User-initiated forgot password (send OTP) ─────────────────────────
  async forgotPassword(email) {
    if (!email) {
      throw new BadRequestException(AppMessages.Errors.Auth.EMAIL_REQUIRED);
    }
    if (!isEmail(email)) {
      throw new BadRequestException(AppMessages.Errors.Auth.INVALID_EMAIL);
    }
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      // For security, don't reveal if email exists
      return { message: 'Nếu email tồn tại, OTP sẽ được gửi' };
    }

    if (user.status === 'LOCKED') {
      throw new UnauthorizedException(AppMessages.Errors.Auth.ACCOUNT_LOCKED);
    }

    if (user.status === 'INACTIVE') {
      throw new UnauthorizedException(AppMessages.Errors.Auth.ACCOUNT_INACTIVE);
    }

    if (user.mustChangePassword) {
      throw new UnauthorizedException(
        AppMessages.Errors.Auth.PASSWORD_CHANGE_REQUIRED,
      );
    }

    // Generate OTP (6 digits) and otpRequestId (UUID)
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpRequestId = uuidv4();

    // Hash OTP for storage
    const hashedOtp = hashResetPasswordToken(otp);

    // Set OTP expiration (1 hour from now)
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Save OTP + otpRequestId to DB (don't set mustChangePassword for user-initiated action)
    await this.userRepository.update(user.id, {
      otp: hashedOtp,
      otpExpiresAt,
      otpRequestId,
    });

    // Create reset URL with otpRequestId and OTP
    const resetUrl = `${config.frontEndUrl}/forgot-password?requestId=${otpRequestId}&otp=${otp}`;

    // Send email
    await this.mailService.sendResetPasswordEmail(
      user.email,
      user.username,
      resetUrl,
    );

    return {
      message: 'OTP đã được gửi đến email của bạn',
      otpRequestId, // Return for frontend
    };
  }

  // ── User verify OTP and reset password ───────────────────────────────
  async resetPasswordWithOtp(otpRequestId, otp, newPassword) {
    if (!otpRequestId) {
      throw new BadRequestException(AppMessages.Errors.Auth.RESET_OTP_INVALID);
    }
    if (!otp) {
      throw new BadRequestException(AppMessages.Errors.Auth.RESET_OTP_INVALID);
    }
    if (!/^\d{6}$/.test(otp)) {
      throw new BadRequestException(AppMessages.Errors.Auth.RESET_OTP_INVALID);
    }
    if (!newPassword) {
      throw new BadRequestException(AppMessages.Errors.Auth.PASSWORD_REQUIRED);
    }
    if (
      !matches(
        newPassword,
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      )
    ) {
      throw new BadRequestException(AppMessages.Errors.Auth.INVALID_PASSWORD);
    }

    // Find user by otpRequestId
    const user = await this.userRepository.findOne({ otpRequestId });

    if (!user) {
      throw new BadRequestException(AppMessages.Errors.Auth.ACCOUNT_NOT_FOUND);
    }

    if (user.status === 'LOCKED') {
      throw new UnauthorizedException(AppMessages.Errors.Auth.ACCOUNT_LOCKED);
    }

    if (user.status === 'INACTIVE') {
      throw new UnauthorizedException(AppMessages.Errors.Auth.ACCOUNT_INACTIVE);
    }

    if (user.mustChangePassword) {
      throw new UnauthorizedException(
        AppMessages.Errors.Auth.PASSWORD_CHANGE_REQUIRED,
      );
    }

    // Check if OTP exists and not expired
    if (!user.otp) {
      throw new BadRequestException(AppMessages.Errors.Auth.RESET_OTP_INVALID);
    }

    if (user.otpExpiresAt !== null) {
      const now = new Date();
      if (now > user.otpExpiresAt) {
        throw new BadRequestException(
          AppMessages.Errors.Auth.RESET_OTP_INVALID,
        );
      }
    }

    // Verify OTP
    const hashedInputOtp = hashResetPasswordToken(otp);
    if (hashedInputOtp !== user.otp) {
      throw new BadRequestException(AppMessages.Errors.Auth.RESET_OTP_INVALID);
    }

    const hashNewPassword = await hashPassword(newPassword);

    await this.userRepository.update(user.id, {
      password: hashNewPassword,
      otp: null,
      otpExpiresAt: null,
      otpRequestId: null,
      mustChangePassword: false,
    });

    return { message: 'Mật khẩu đã được đặt lại thành công' };
  }
}
