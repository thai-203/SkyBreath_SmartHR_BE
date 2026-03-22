import { AppMessages } from '../common/constants/index.js';
import {
  NotFoundException,
  ConflictException,
} from '../common/exceptions/index.js';
import { AppDataSource } from '../database/data-source.js';
import { PositionEntity } from '../models/entities/position.entity.js';
import { JobGradeEntity } from '../models/entities/job-grade.entity.js';
import { DepartmentsRepository } from '../repositories/departments.repository.js';
import { UserEntity } from '../models/entities/user.entity.js';
import { RoleEntity } from '../models/entities/role.entity.js';
import { UserRoleEntity } from '../models/entities/user-role.entity.js';
import { hashPassword } from '../common/utils/index.js';
import { ExcelUtil } from '../common/utils/excel.util.js';
import { mailService } from './mail.service.js';
import crypto from 'crypto';

const generateRandomPassword = () => {
  return crypto.randomBytes(6).toString('base64').slice(0, 10) + 'A1!';
};

export class EmployeesService {
  constructor(employeesRepository) {
    this.employeesRepository = employeesRepository;
  }

  async findAll(queryDto) {
    const result = await this.employeesRepository.findAll(queryDto);
    return {
      ...result,
      page: queryDto.page,
      limit: queryDto.limit,
      totalPages: Math.ceil(result.total / queryDto.limit),
    };
  }

  async create(createDto) {
    // Check employeeCode uniqueness
    if (createDto.employeeCode) {
      const existingCode = await this.employeesRepository.findByField(
        'employeeCode',
        createDto.employeeCode,
      );
      if (existingCode) {
        throw new ConflictException(AppMessages.Errors.Employee.CODE_DUPLICATE);
      }
    }

    if (createDto.personalEmail) {
      const existing = await this.employeesRepository.findByField(
        'personalEmail',
        createDto.personalEmail,
      );
      if (existing) {
        throw new ConflictException(
          AppMessages.Errors.Employee.EMAIL_DUPLICATE,
        );
      }
    }

    if (createDto.phoneNumber) {
      const existing = await this.employeesRepository.findByField(
        'phoneNumber',
        createDto.phoneNumber,
      );
      if (existing) {
        throw new ConflictException(
          AppMessages.Errors.Employee.PHONE_DUPLICATE,
        );
      }
    }

    if (createDto.nationalId) {
      const existing = await this.employeesRepository.findByField(
        'nationalId',
        createDto.nationalId,
      );
      if (existing) {
        throw new ConflictException(
          AppMessages.Errors.Employee.NATIONAL_ID_DUPLICATE,
        );
      }
    }

    // Handle User Account Creation
    if (createDto.companyEmail) {
      const userRepo = AppDataSource.getRepository(UserEntity);
      const roleRepo = AppDataSource.getRepository(RoleEntity);
      const userRoleRepo = AppDataSource.getRepository(UserRoleEntity);

      // Check if user already exists
      let user = await userRepo.findOne({
        where: { email: createDto.companyEmail },
      });

      if (!user) {
        const randomPassword = generateRandomPassword();
        const password = await hashPassword(randomPassword);
        user = userRepo.create({
          username: createDto.companyEmail.split('@')[0],
          email: createDto.companyEmail,
          password: password,
          status: 'ACTIVE',
        });
        await userRepo.save(user);

        // Assign default role (EMPLOYEE)
        const role = await roleRepo.findOne({
          where: { roleName: 'EMPLOYEE' },
        });
        if (role) {
          const userRole = userRoleRepo.create({
            userId: user.id,
            roleId: role.id,
          });
          await userRoleRepo.save(userRole);
        }

        // Send email notification with random password
        await mailService.sendAccountInfo(
          user.email,
          createDto.fullName,
          user.username,
          randomPassword,
        );
      }
      createDto.userId = user.id;
    }

    return this.employeesRepository.create(createDto);
  }

  async getMetadata() {
    const deptRepo = new DepartmentsRepository();
    const positions = await AppDataSource.getRepository(PositionEntity).find({
      where: { isDeleted: false },
      order: { positionName: 'ASC' },
    });
    const jobGrades = await AppDataSource.getRepository(JobGradeEntity).find({
      where: { isDeleted: false },
      order: { gradeName: 'ASC' },
    });
    const departments = await deptRepo.findList();
    const managers = await this.getDropdownList('MANAGER');
    const hrMentors = await this.getDropdownList('HR');

    return {
      departments,
      positions,
      jobGrades,
      managers,
      hrMentors,
      genderOptions: [
        { value: 'MALE', label: 'Nam' },
        { value: 'FEMALE', label: 'Nữ' },
        { value: 'OTHER', label: 'Khác' },
      ],
      maritalStatusOptions: [
        { value: 'SINGLE', label: 'Độc thân' },
        { value: 'MARRIED', label: 'Đã kết hôn' },
        { value: 'DIVORCED', label: 'Đã ly hôn' },
        { value: 'WIDOWED', label: 'Góa vụ' },
      ],
      employmentStatusOptions: [
        { value: 'PROBATION', label: 'Thử việc' },
        { value: 'ACTIVE', label: 'Đang làm việc' },
        { value: 'ON_LEAVE', label: 'Nghỉ phép' },
        { value: 'TERMINATED', label: 'Đã nghỉ việc' },
      ],
    };
  }

  async getDropdownList(roleName, excludeWithContract = false) {
    return this.employeesRepository.findDropdownList(
      roleName,
      excludeWithContract,
    );
  }

  async findById(id) {
    const employee = await this.employeesRepository.findById(id);
    if (!employee) {
      throw new NotFoundException(AppMessages.Errors.Employee.NOT_FOUND);
    }
    return employee;
  }

  async update(id, updateDto) {
    const employee = await this.findById(id);

    if (updateDto.personalEmail) {
      const existing = await this.employeesRepository.findByField(
        'personalEmail',
        updateDto.personalEmail,
        id,
      );
      if (existing) {
        throw new ConflictException(
          AppMessages.Errors.Employee.EMAIL_DUPLICATE,
        );
      }
    }

    if (updateDto.phoneNumber) {
      const existing = await this.employeesRepository.findByField(
        'phoneNumber',
        updateDto.phoneNumber,
        id,
      );
      if (existing) {
        throw new ConflictException(
          AppMessages.Errors.Employee.PHONE_DUPLICATE,
        );
      }
    }

    if (updateDto.nationalId) {
      const existing = await this.employeesRepository.findByField(
        'nationalId',
        updateDto.nationalId,
        id,
      );
      if (existing) {
        throw new ConflictException(
          AppMessages.Errors.Employee.NATIONAL_ID_DUPLICATE,
        );
      }
    }

    return this.employeesRepository.update(employee.id, updateDto);
  }

  async delete(id) {
    const employee = await this.findById(id);
    return this.employeesRepository.softDelete(employee.id);
  }

  async findValidationData() {
    return this.employeesRepository.findValidationData();
  }

  async exportExcel() {
    const { items } = await this.employeesRepository.findAll({
      limit: 10000,
      page: 1,
    });

    const statusLabels = {
      PROBATION: 'Thử việc',
      ACTIVE: 'Đang làm việc',
      ON_LEAVE: 'Nghỉ phép',
      TERMINATED: 'Đã nghỉ việc',
    };

    const maritalStatusLabels = {
      SINGLE: 'Độc thân',
      MARRIED: 'Đã kết hôn',
      DIVORCED: 'Đã ly hôn',
      WIDOWED: 'Góa phụ/Góa chồng',
    };

    const genderLabels = {
      MALE: 'Nam',
      FEMALE: 'Nữ',
      OTHER: 'Khác',
    };

    const data = items.map((e, index) => ({
      index: index + 1,
      employeeCode: e.employeeCode || '',
      fullName: e.fullName,
      gender: genderLabels[e.gender] || e.gender,
      dateOfBirth: e.dateOfBirth
        ? new Date(e.dateOfBirth).toLocaleDateString('vi-VN')
        : '',
      nationalId: e.nationalId || '',
      nationalIdIssuedDate: e.nationalIdIssuedDate
        ? new Date(e.nationalIdIssuedDate).toLocaleDateString('vi-VN')
        : '',
      nationalIdIssuedPlace: e.nationalIdIssuedPlace || '',
      nationality: e.nationality || '',
      maritalStatus: maritalStatusLabels[e.maritalStatus] || e.maritalStatus,
      taxCode: e.taxCode || '',
      companyEmail: e.companyEmail || '',
      personalEmail: e.personalEmail || '',
      phoneNumber: e.phoneNumber || '',
      educationLevel: e.educationLevel || '',
      currentAddress: e.currentAddress || '',
      permanentAddress: e.permanentAddress || '',
      department: e.department?.departmentName || '',
      position: e.position?.positionName || '',
      jobGrade: e.jobGrade?.gradeName || '',
      directManager: e.directManager?.fullName || '',
      hrMentor: e.hrMentor?.fullName || '',
      joinDate: e.joinDate
        ? new Date(e.joinDate).toLocaleDateString('vi-VN')
        : '',
      officialStartDate: e.officialStartDate
        ? new Date(e.officialStartDate).toLocaleDateString('vi-VN')
        : '',
      status: statusLabels[e.employmentStatus] || e.employmentStatus,
    }));

    const columns = [
      { header: 'STT', key: 'index', width: 8 },
      { header: 'Mã nhân viên', key: 'employeeCode', width: 15 },
      { header: 'Họ và tên', key: 'fullName', width: 25 },
      { header: 'Giới tính', key: 'gender', width: 12 },
      { header: 'Ngày sinh', key: 'dateOfBirth', width: 15 },
      { header: 'Số CMND/CCCD', key: 'nationalId', width: 15 },
      { header: 'Ngày cấp', key: 'nationalIdIssuedDate', width: 15 },
      { header: 'Nơi cấp', key: 'nationalIdIssuedPlace', width: 20 },
      { header: 'Quốc tịch', key: 'nationality', width: 15 },
      { header: 'Tình trạng hôn nhân', key: 'maritalStatus', width: 20 },
      { header: 'Mã số thuế', key: 'taxCode', width: 15 },
      { header: 'Email công ty', key: 'companyEmail', width: 25 },
      { header: 'Email cá nhân', key: 'personalEmail', width: 25 },
      { header: 'Số điện thoại', key: 'phoneNumber', width: 15 },
      { header: 'Trình độ học vấn', key: 'educationLevel', width: 20 },
      { header: 'Địa chỉ hiện tại', key: 'currentAddress', width: 30 },
      { header: 'Địa chỉ thường trú', key: 'permanentAddress', width: 30 },
      { header: 'Phòng ban', key: 'department', width: 20 },
      { header: 'Chức vụ', key: 'position', width: 20 },
      { header: 'Cấp bậc', key: 'jobGrade', width: 15 },
      { header: 'Quản lý trực tiếp', key: 'directManager', width: 25 },
      { header: 'Người hướng dẫn HR', key: 'hrMentor', width: 25 },
      { header: 'Ngày vào làm', key: 'joinDate', width: 15 },
      { header: 'Ngày chính thức', key: 'officialStartDate', width: 15 },
      { header: 'Trạng thái', key: 'status', width: 15 },
    ];

    return ExcelUtil.export(data, columns, 'Danh sách nhân viên');
  }

  async getEmployeeNoPlanId() {
    return this.employeesRepository.getEmployeeNoPlanId();
  }

  async getByUserId(userId) {
    return this.employeesRepository.getByUserId(userId);
  }
}
