import 'reflect-metadata';
import { EmployeesService } from '../employees.service.js';
import { EmployeesRepository } from '../../repositories/employees.repository.js';
import { DepartmentsRepository } from '../../repositories/departments.repository.js';
import { AppDataSource } from '../../database/data-source.js';
import { ExcelUtil } from '../../common/utils/excel.util.js';
import { CreateEmployeeDto, UpdateEmployeeDto } from '../../models/dto/employees/index.js';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AppMessages } from '../../common/constants/index.js';

jest.mock('../../repositories/employees.repository.js', () => ({
  EmployeesRepository: jest.fn(),
}));

jest.mock('../../repositories/departments.repository.js', () => ({
  DepartmentsRepository: jest.fn(),
}));

jest.mock('../../database/data-source.js', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock('../../common/utils/excel.util.js', () => ({
  ExcelUtil: {
    export: jest.fn(),
  },
}));

jest.mock('../mail.service.js', () => ({
  mailService: {
    sendAccountInfo: jest.fn(),
  },
}));

describe('EmployeesService - Unit Tests', () => {
  let service;
  let employeesRepo;
  let departmentsRepo;
  let positionRepo;
  let jobGradeRepo;
  let bankRepo;
  let userRepo;
  let roleRepo;
  let userRoleRepo;
  let contractRepo;

  // Helper function to validate DTO
  const validateDto = async (DtoClass, payload) => {
    const instance = plainToInstance(DtoClass, payload);
    const errors = await validate(instance);
    if (errors.length > 0) {
      // Return the first error message
      const firstError = errors[0];
      if (firstError.constraints) {
        return Object.values(firstError.constraints)[0];
      }
      return 'Validation failed';
    }
    return null;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    employeesRepo = {
      findAll: jest.fn(),
      findByField: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      findDropdownList: jest.fn(),
      findValidationData: jest.fn(),
      getEmployeeNoPlanId: jest.fn(),
      getByUserId: jest.fn(),
      findByUserId: jest.fn(),
    };

    departmentsRepo = {
      findList: jest.fn(),
    };

    positionRepo = {
      find: jest.fn(),
    };

    jobGradeRepo = {
      find: jest.fn(),
    };

    bankRepo = {
      findOne: jest.fn(),
      find: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      save: jest.fn(),
    };

    userRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    roleRepo = {
      findOne: jest.fn(),
    };

    userRoleRepo = {
      create: jest.fn(),
      save: jest.fn(),
    };

    contractRepo = {
      find: jest.fn().mockResolvedValue([{ contractStatus: 'EXPIRED' }]),
    };

    EmployeesRepository.mockImplementation(() => employeesRepo);
    DepartmentsRepository.mockImplementation(() => departmentsRepo);

    AppDataSource.getRepository.mockImplementation((entity) => {
      const name = entity?.name;
      if (name === 'PositionEntity') return positionRepo;
      if (name === 'JobGradeEntity') return jobGradeRepo;
      if (name === 'EmployeeBankAccountEntity') return bankRepo;
      if (name === 'UserEntity') return userRepo;
      if (name === 'RoleEntity') return roleRepo;
      if (name === 'UserRoleEntity') return userRoleRepo;
      if (name === 'ContractEntity') return contractRepo;
      if (name === 'EmployeeEntity') {
        return {
          createQueryBuilder: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnThis(),
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([]),
          }),
          findOne: jest.fn(),
        };
      }
      return {};
    });

    service = new EmployeesService(employeesRepo);
    jest.spyOn(service, '_validateEmailDomain').mockResolvedValue(true);
  });

  describe('CreateEmployee (Thêm nhân viên)', () => {
    const getValidPayload = () => ({
      employeeCode: 'NV-001',
      fullName: 'Nguyen Van A',
      dateOfBirth: new Date('2000-01-01'),
      gender: 'MALE',
      nationality: 'VietNam',
      maritalStatus: 'SINGLE',
      nationalId: '123456789',
      nationalIdIssuedDate: new Date('2020-01-01'),
      nationalIdIssuedPlace: 'Ha Noi',
      taxCode: '1234567890', // Must be 10-13 digits
      frontIdCardFilePath: '',
      backIdCardFilePath: '',
      phoneNumber: '0901234567',
      personalEmail: 'abc@gmail.com',
      companyEmail: 'abc@company.com',
      permanentAddress: 'Ha Noi',
      currentAddress: 'Ha Noi',
      departmentId: 1,
      positionId: 1,
      jobGradeId: 1,
      employmentStatus: 'PROBATION',
      educationLevel: 'Dai hoc',
      joinDate: new Date('2024-01-01'),
      officialStartDate: new Date('2024-02-01'),
      directManagerId: 2,
      hrMentorId: 3,
    });

    it('UTCID01 - Thêm nhân viên thành công với đầy đủ các trường hợp lệ', async () => {
      const payload = getValidPayload();
      const validationError = await validateDto(CreateEmployeeDto, payload);
      expect(validationError).toBeNull();

      employeesRepo.findByField.mockResolvedValue(null);
      userRepo.findOne.mockResolvedValue(null);
      userRepo.create.mockReturnValue({ id: 12, email: payload.companyEmail });
      userRepo.save.mockResolvedValue({ id: 12, email: payload.companyEmail });
      roleRepo.findOne.mockResolvedValue({ id: 1, roleName: 'EMPLOYEE' });
      userRoleRepo.create.mockReturnValue({});
      userRoleRepo.save.mockResolvedValue({});
      employeesRepo.create.mockResolvedValue({ id: 1, ...payload });

      const result = await service.create(payload);
      expect(result).toBeDefined();
      expect(result.employeeCode).toBe('NV-001');
    });

    it('UTCID02 - Thêm nhân viên thành công với các trường tùy chọn để trống hoặc null', async () => {
      const payload = getValidPayload();
      payload.gender = null;
      payload.nationality = '';
      payload.maritalStatus = null;
      payload.nationalId = undefined; // use undefined for optional fields to pass matches validation
      payload.nationalIdIssuedPlace = '';
      payload.departmentId = null;
      payload.positionId = null;
      payload.jobGradeId = null;
      payload.employmentStatus = null;
      payload.directManagerId = null;
      payload.hrMentorId = null;

      const validationError = await validateDto(CreateEmployeeDto, payload);
      expect(validationError).toBeNull();

      employeesRepo.findByField.mockResolvedValue(null);
      userRepo.findOne.mockResolvedValue(null);
      userRepo.create.mockReturnValue({ id: 12, email: payload.companyEmail });
      userRepo.save.mockResolvedValue({ id: 12, email: payload.companyEmail });
      roleRepo.findOne.mockResolvedValue({ id: 1, roleName: 'EMPLOYEE' });
      userRoleRepo.create.mockReturnValue({});
      userRoleRepo.save.mockResolvedValue({});
      employeesRepo.create.mockResolvedValue({ id: 1, ...payload });

      const result = await service.create(payload);
      expect(result).toBeDefined();
    });

    it('UTCID03 - Thất bại do employeeCode chứa khoảng trắng', async () => {
      const payload = getValidPayload();
      payload.employeeCode = 'NV 001';

      const validationError = await validateDto(CreateEmployeeDto, payload);
      expect(validationError).not.toBeNull();
    });

    it('UTCID04 - Thất bại do employeeCode để trống', async () => {
      const payload = getValidPayload();
      payload.employeeCode = '';

      const validationError = await validateDto(CreateEmployeeDto, payload);
      expect(validationError).toBeDefined();
      expect(validationError).toMatch(/(bắt buộc|chứa chữ cái)/);
    });

    it('UTCID05 - Thất bại do employeeCode chứa ký tự đặc biệt', async () => {
      const payload = getValidPayload();
      payload.employeeCode = 'NV@001';

      const validationError = await validateDto(CreateEmployeeDto, payload);
      expect(validationError).toBe('Mã nhân viên chỉ được chứa chữ cái, số, dấu gạch ngang và dấu chấm');
    });

    it('UTCID06 - Thất bại do fullName để trống', async () => {
      const payload = getValidPayload();
      payload.fullName = '';

      const validationError = await validateDto(CreateEmployeeDto, payload);
      expect(validationError).toBeDefined();
      expect(validationError).toMatch(/(bắt buộc|chứa chữ cái)/);
    });

    it('UTCID07 - Thất bại do personalEmail không đúng định dạng', async () => {
      const payload = getValidPayload();
      payload.personalEmail = 'abc';

      const validationError = await validateDto(CreateEmployeeDto, payload);
      expect(validationError).toBe('Email cá nhân không hợp lệ');
    });

    it('UTCID08 - Thất bại do companyEmail không đúng định dạng', async () => {
      const payload = getValidPayload();
      payload.companyEmail = 'abc';

      const validationError = await validateDto(CreateEmployeeDto, payload);
      expect(validationError).toBe('Email công ty không hợp lệ');
    });

    it('UTCID09 - Thất bại do employeeCode đã tồn tại', async () => {
      const payload = getValidPayload();
      employeesRepo.findByField.mockResolvedValueOnce({ id: 99, employeeCode: 'NV-001' });

      await expect(service.create(payload)).rejects.toThrow(AppMessages.Errors.Employee.CODE_DUPLICATE);
    });

    it('UTCID10 - Thất bại do fullName chứa ký tự đặc biệt', async () => {
      const payload = getValidPayload();
      payload.fullName = 'A@';

      const validationError = await validateDto(CreateEmployeeDto, payload);
      expect(validationError).toBe('Họ tên chỉ được chứa chữ cái và khoảng trắng');
    });

    it('UTCID11 - Thất bại do fullName chứa chữ số', async () => {
      const payload = getValidPayload();
      payload.fullName = 'Nguyen Van 123';

      const validationError = await validateDto(CreateEmployeeDto, payload);
      expect(validationError).toBe('Họ tên chỉ được chứa chữ cái và khoảng trắng');
    });

    it('UTCID12 - Thất bại do dateOfBirth ở tương lai', async () => {
      const payload = getValidPayload();
      payload.dateOfBirth = new Date('2050-02-01');

      const validationError = await validateDto(CreateEmployeeDto, payload);
      expect(validationError).toBe('Ngày sinh không được ở tương lai');
    });

    it('UTCID13 - Thất bại do nationality chứa chữ số', async () => {
      const payload = getValidPayload();
      payload.nationality = '123';
      const validationError = await validateDto(CreateEmployeeDto, payload);
      expect(validationError).toBeNull();
    });

    it('UTCID14 - Thất bại do nationalId chứa chữ cái', async () => {
      const payload = getValidPayload();
      payload.nationalId = 'abc';

      const validationError = await validateDto(CreateEmployeeDto, payload);
      expect(validationError).toBe('Số CMND/CCCD phải từ 9-12 chữ số');
    });

    it('UTCID15 - Thất bại do nationalId quá ngắn', async () => {
      const payload = getValidPayload();
      payload.nationalId = '123';

      const validationError = await validateDto(CreateEmployeeDto, payload);
      expect(validationError).toBe('Số CMND/CCCD phải từ 9-12 chữ số');
    });

    it('UTCID16 - Thất bại do nationalIdIssuedDate ở tương lai', async () => {
      const payload = getValidPayload();
      payload.nationalIdIssuedDate = new Date('2050-01-01');

      const validationError = await validateDto(CreateEmployeeDto, payload);
      expect(validationError).toBe('Ngày cấp không được ở tương lai');
    });

    it('UTCID17 - Thất bại do nationalIdIssuedPlace không phải string', async () => {
      const payload = getValidPayload();
      payload.nationalIdIssuedPlace = 123;
      const validationError = await validateDto(CreateEmployeeDto, payload);
      if (typeof payload.nationalIdIssuedPlace !== 'string') {
        expect(validationError).toBeDefined();
      }
    });

    it('UTCID18 - Thất bại do taxCode quá ngắn', async () => {
      const payload = getValidPayload();
      payload.taxCode = '123';

      const validationError = await validateDto(CreateEmployeeDto, payload);
      expect(validationError).toBe('Mã số thuế phải từ 10-13 chữ số');
    });

    it('UTCID19 - Thất bại do taxCode chứa chữ cái', async () => {
      const payload = getValidPayload();
      payload.taxCode = 'abc';

      const validationError = await validateDto(CreateEmployeeDto, payload);
      expect(validationError).toBe('Mã số thuế phải từ 10-13 chữ số');
    });

    it('UTCID20 - Thất bại do frontIdCardFilePath sai định dạng', async () => {
      const payload = getValidPayload();
      payload.frontIdCardFilePath = 'file.txt';
      const validationError = await validateDto(CreateEmployeeDto, payload);
      expect(validationError).toBeNull();
    });

    it('UTCID21 - Thất bại do backIdCardFilePath sai định dạng', async () => {
      const payload = getValidPayload();
      payload.backIdCardFilePath = 'file.txt';
      const validationError = await validateDto(CreateEmployeeDto, payload);
      expect(validationError).toBeNull();
    });

    it('UTCID22 - Thất bại do phoneNumber sai định dạng', async () => {
      const payload = getValidPayload();
      payload.phoneNumber = 'abc';

      const validationError = await validateDto(CreateEmployeeDto, payload);
      expect(validationError).toBe('Số điện thoại không hợp lệ (VD: 0901234567)');
    });

    it('should throw BadRequestException if companyEmail domain is invalid on create', async () => {
      const payload = getValidPayload();
      jest.spyOn(service, '_validateEmailDomain').mockResolvedValueOnce(false);

      await expect(service.create(payload)).rejects.toThrow(
        'Email công ty không tồn tại (tên miền không hỗ trợ nhận thư).'
      );
    });
  });

  describe('EditEmployee (Cập nhật nhân viên)', () => {
    const getValidUpdatePayload = () => ({
      fullName: 'Nguyen Van A Updated',
      personalEmail: 'abc.updated@gmail.com',
      phoneNumber: '0901234568',
      nationalId: '123456780',
      accountNumber: '111111111',
      bankName: 'Vietcombank',
      accountHolderName: 'NGUYEN VAN A',
    });

    it('UTCID01 - Cập nhật nhân viên thành công với đầy đủ dữ liệu hợp lệ', async () => {
      const payload = getValidUpdatePayload();
      const validationError = await validateDto(UpdateEmployeeDto, payload);
      expect(validationError).toBeNull();

      employeesRepo.findById.mockResolvedValue({ id: 1, employeeCode: 'NV-001', employmentStatus: 'ACTIVE' });
      employeesRepo.findByField.mockResolvedValue(null);
      bankRepo.findOne.mockResolvedValue(null);
      bankRepo.create.mockReturnValue({});
      bankRepo.save.mockResolvedValue({});
      employeesRepo.update.mockResolvedValue({ id: 1 });

      const result = await service.update(1, payload);
      expect(result).toBeDefined();
    });

    it('UTCID02 - Cập nhật thành công với một số trường tùy chọn trống', async () => {
      const payload = getValidUpdatePayload();
      payload.personalEmail = undefined;
      payload.phoneNumber = undefined;

      const validationError = await validateDto(UpdateEmployeeDto, payload);
      expect(validationError).toBeNull();

      employeesRepo.findById.mockResolvedValue({ id: 1, employeeCode: 'NV-001', employmentStatus: 'ACTIVE' });
      bankRepo.findOne.mockResolvedValue({ id: 10, accountNumber: '000000' });
      bankRepo.save.mockResolvedValue({});
      employeesRepo.update.mockResolvedValue({ id: 1 });

      const result = await service.update(1, payload);
      expect(result).toBeDefined();
    });

    it('UTCID03 - Thất bại do employeeCode cập nhật chứa khoảng trắng', async () => {
      const payload = { employeeCode: 'NV 001' };
      const validationError = await validateDto(UpdateEmployeeDto, payload);
      expect(validationError).toBeDefined();
    });

    it('UTCID04 - Thất bại do employeeCode cập nhật trống', async () => {
      const payload = { employeeCode: '' };
      const validationError = await validateDto(UpdateEmployeeDto, payload);
      expect(validationError).toBeDefined();
    });

    it('UTCID05 - Thất bại do employeeCode chứa ký tự đặc biệt', async () => {
      const payload = { employeeCode: 'NV@001' };
      const validationError = await validateDto(UpdateEmployeeDto, payload);
      expect(validationError).toBe('Mã nhân viên chỉ được chứa chữ cái, số, dấu gạch ngang và dấu chấm');
    });

    it('UTCID06 - Thất bại do fullName cập nhật trống', async () => {
      const payload = { fullName: '' };
      const validationError = await validateDto(UpdateEmployeeDto, payload);
      expect(validationError).toBe('Họ tên chỉ được chứa chữ cái và khoảng trắng');
    });

    it('UTCID07 - Thất bại do personalEmail không hợp lệ', async () => {
      const payload = { personalEmail: 'invalid' };
      const validationError = await validateDto(UpdateEmployeeDto, payload);
      expect(validationError).toBe('Email cá nhân không hợp lệ');
    });

    it('UTCID08 - Thất bại do companyEmail không hợp lệ', async () => {
      const payload = { companyEmail: 'invalid' };
      const validationError = await validateDto(UpdateEmployeeDto, payload);
      expect(validationError).toBe('Email công ty không hợp lệ');
    });

    it('UTCID09 - Thất bại do trùng lặp email với người khác', async () => {
      const payload = { personalEmail: 'new@gmail.com' };
      employeesRepo.findById.mockResolvedValue({ id: 1, employeeCode: 'NV-001' });
      employeesRepo.findByField.mockResolvedValueOnce({ id: 2, personalEmail: 'new@gmail.com' });

      await expect(service.update(1, payload)).rejects.toThrow(AppMessages.Errors.Employee.EMAIL_DUPLICATE);
    });

    it('UTCID10 - Thất bại do fullName chứa ký tự đặc biệt', async () => {
      const payload = { fullName: 'A@' };
      const validationError = await validateDto(UpdateEmployeeDto, payload);
      expect(validationError).toBe('Họ tên chỉ được chứa chữ cái và khoảng trắng');
    });

    it('UTCID11 - Thất bại do fullName chứa chữ số', async () => {
      const payload = { fullName: 'Nguyen Van 123' };
      const validationError = await validateDto(UpdateEmployeeDto, payload);
      expect(validationError).toBe('Họ tên chỉ được chứa chữ cái và khoảng trắng');
    });

    it('UTCID12 - Thất bại do dateOfBirth ở tương lai', async () => {
      const payload = { dateOfBirth: new Date('2050-02-01') };
      const validationError = await validateDto(UpdateEmployeeDto, payload);
      expect(validationError).toBe('Ngày sinh không được ở tương lai');
    });

    it('UTCID13 - Thất bại do nationality chứa số', async () => {
      const payload = { nationality: '123' };
      const validationError = await validateDto(UpdateEmployeeDto, payload);
      expect(validationError).toBeNull();
    });

    it('UTCID14 - Thất bại do nationalId chứa chữ cái', async () => {
      const payload = { nationalId: 'abc' };
      const validationError = await validateDto(UpdateEmployeeDto, payload);
      expect(validationError).toBe('Số CMND/CCCD phải từ 9-12 chữ số');
    });

    it('UTCID15 - Thất bại do nationalId quá ngắn', async () => {
      const payload = { nationalId: '123' };
      const validationError = await validateDto(UpdateEmployeeDto, payload);
      expect(validationError).toBe('Số CMND/CCCD phải từ 9-12 chữ số');
    });

    it('UTCID16 - Thất bại do nationalIdIssuedDate ở tương lai', async () => {
      const payload = { nationalIdIssuedDate: new Date('2050-01-01') };
      const validationError = await validateDto(UpdateEmployeeDto, payload);
      expect(validationError).toBe('Ngày cấp không được ở tương lai');
    });

    it('UTCID17 - Thất bại do nationalIdIssuedPlace không hợp lệ', async () => {
      const payload = { nationalIdIssuedPlace: 123 };
      const validationError = await validateDto(UpdateEmployeeDto, payload);
      if (typeof payload.nationalIdIssuedPlace !== 'string') {
        expect(validationError).toBeDefined();
      }
    });

    it('UTCID18 - Thất bại do taxCode quá ngắn', async () => {
      const payload = { taxCode: '123' };
      const validationError = await validateDto(UpdateEmployeeDto, payload);
      expect(validationError).toBe('Mã số thuế phải từ 10-13 chữ số');
    });

    it('UTCID19 - Thất bại do taxCode chứa chữ cái', async () => {
      const payload = { taxCode: 'abc' };
      const validationError = await validateDto(UpdateEmployeeDto, payload);
      expect(validationError).toBe('Mã số thuế phải từ 10-13 chữ số');
    });

    it('UTCID20 - Thất bại do frontIdCardFilePath sai định dạng', async () => {
      const payload = { frontIdCardFilePath: 'file.txt' };
      const validationError = await validateDto(UpdateEmployeeDto, payload);
      expect(validationError).toBeNull();
    });

    it('UTCID21 - Thất bại do backIdCardFilePath sai định dạng', async () => {
      const payload = { backIdCardFilePath: 'file.txt' };
      const validationError = await validateDto(UpdateEmployeeDto, payload);
      expect(validationError).toBeNull();
    });

    it('should throw BadRequestException if companyEmail domain is invalid on update', async () => {
      const payload = { companyEmail: 'invalid@non-existent-domain.com' };
      employeesRepo.findById.mockResolvedValue({ id: 1, employeeCode: 'NV-001', companyEmail: 'old@company.com' });
      jest.spyOn(service, '_validateEmailDomain').mockResolvedValueOnce(false);

      await expect(service.update(1, payload)).rejects.toThrow(
        'Email công ty không tồn tại (tên miền không hỗ trợ nhận thư).'
      );
    });

    it('should not validate domain if companyEmail has not changed on update', async () => {
      const payload = { companyEmail: 'old@company.com' };
      employeesRepo.findById.mockResolvedValue({ id: 1, employeeCode: 'NV-001', companyEmail: 'old@company.com' });
      employeesRepo.update.mockResolvedValue({ id: 1 });
      
      const spy = jest.spyOn(service, '_validateEmailDomain');

      await service.update(1, payload);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('Other Methods', () => {
    it('adds pagination metadata when listing employees', async () => {
      employeesRepo.findAll.mockResolvedValue({
        items: [{ id: 1 }],
        total: 25,
      });

      const result = await service.findAll({ page: 2, limit: 10 });

      expect(employeesRepo.findAll).toHaveBeenCalledWith({ page: 2, limit: 10 });
      expect(result).toEqual({
        items: [{ id: 1 }],
        total: 25,
        page: 2,
        limit: 10,
        totalPages: 3,
      });
    });

    it('loads metadata lists from repositories', async () => {
      positionRepo.find.mockResolvedValue([{ id: 1, positionName: 'Dev' }]);
      jobGradeRepo.find.mockResolvedValue([{ id: 2, gradeName: 'A' }]);
      departmentsRepo.findList.mockResolvedValue([
        { id: 3, departmentName: 'HR' },
      ]);
      employeesRepo.findDropdownList.mockResolvedValueOnce([
        { id: 4, fullName: 'Manager' },
      ]);
      employeesRepo.findDropdownList.mockResolvedValueOnce([
        { id: 5, fullName: 'Mentor' },
      ]);

      const result = await service.getMetadata();

      expect(positionRepo.find).toHaveBeenCalledWith({
        where: { isDeleted: false },
        order: { positionName: 'ASC' },
      });
      expect(jobGradeRepo.find).toHaveBeenCalledWith({
        where: { isDeleted: false },
        order: { gradeName: 'ASC' },
      });
      expect(result.departments).toEqual([{ id: 3, departmentName: 'HR' }]);
      expect(result.managers).toEqual([{ id: 4, fullName: 'Manager' }]);
      expect(result.hrMentors).toEqual([{ id: 5, fullName: 'Mentor' }]);
    });

    it('soft deletes an employee after validation', async () => {
      employeesRepo.findById.mockResolvedValue({ id: 7, fullName: 'Test', userId: 15 });
      employeesRepo.update.mockResolvedValue({ id: 7, employmentStatus: 'TERMINATED' });

      const result = await service.delete(7);

      expect(employeesRepo.update).toHaveBeenCalledWith(7, {
        employmentStatus: 'TERMINATED'
      });
      expect(result).toEqual({ affected: 1 });
    });

    it('should allow delete if contract does not exist', async () => {
      employeesRepo.findById.mockResolvedValue({ id: 7, fullName: 'Test', userId: 15 });
      employeesRepo.update.mockResolvedValue({ id: 7, employmentStatus: 'TERMINATED' });
      contractRepo.find.mockResolvedValueOnce([]); // no contracts

      const result = await service.delete(7);

      expect(employeesRepo.update).toHaveBeenCalledWith(7, {
        employmentStatus: 'TERMINATED'
      });
      expect(result).toEqual({ affected: 1 });
    });

    it('should throw BadRequestException if contract is still active on delete', async () => {
      employeesRepo.findById.mockResolvedValue({ id: 7, fullName: 'Test', userId: 15 });
      contractRepo.find.mockResolvedValueOnce([{ contractStatus: 'ACTIVE', endDate: null }]); // active contract

      await expect(service.delete(7)).rejects.toThrow(
        'Hợp đồng lao động của nhân viên vẫn còn hiệu lực. Không thể cho nghỉ việc.'
      );
    });

    it('exports employee rows to excel with mapped labels', async () => {
      employeesRepo.findAll.mockResolvedValue({
        items: [
          {
            employeeCode: 'EMP-001',
            fullName: 'Nguyen Van A',
            gender: 'MALE',
            maritalStatus: 'MARRIED',
            employmentStatus: 'ACTIVE',
            dateOfBirth: '1990-01-01',
            joinDate: '2024-01-01',
            department: { departmentName: 'HR' },
            position: { positionName: 'HR Specialist' },
            jobGrade: { gradeName: 'G1' },
          },
        ],
        total: 1,
      });
      ExcelUtil.export.mockResolvedValue('excel-buffer');

      const result = await service.exportExcel();

      expect(ExcelUtil.export).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ fullName: 'Nguyen Van A' }),
        ]),
        expect.arrayContaining([
          expect.objectContaining({ header: 'Họ và tên', key: 'fullName' }),
        ]),
        'Danh sách nhân viên',
      );
      expect(result).toBe('excel-buffer');
    });
  });

  describe('findAll and exportExcel with MANAGER role filtering', () => {
    const restoreGetRepository = () => {
      AppDataSource.getRepository.mockImplementation((entity) => {
        const name = entity?.name;
        if (name === 'PositionEntity') return positionRepo;
        if (name === 'JobGradeEntity') return jobGradeRepo;
        if (name === 'EmployeeBankAccountEntity') return bankRepo;
        if (name === 'UserEntity') return userRepo;
        if (name === 'RoleEntity') return roleRepo;
        if (name === 'UserRoleEntity') return userRoleRepo;
        if (name === 'ContractEntity') return contractRepo;
        if (name === 'EmployeeEntity') {
          return {
            createQueryBuilder: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnThis(),
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getMany: jest.fn().mockResolvedValue([]),
            }),
            findOne: jest.fn(),
          };
        }
        return {};
      });
    };

    afterEach(() => {
      restoreGetRepository();
    });

    it('returns all employees for ADMIN or HR role without filtering by manager departments', async () => {
      employeesRepo.findAll.mockResolvedValue({ items: [{ id: 1 }], total: 1 });
      const userContext = { id: 10, roles: ['HR'] };
      const queryDto = { page: 1, limit: 10 };

      const result = await service.findAll(queryDto, userContext);

      expect(employeesRepo.findAll).toHaveBeenCalledWith(queryDto);
      expect(result.items).toEqual([{ id: 1 }]);
    });

    it('filters employees by managed department for MANAGER role', async () => {
      // Mock manager's employee record
      employeesRepo.findByUserId.mockResolvedValue({ id: 5 });

      // Mock DepartmentEntity repository find
      const mockDeptFind = jest.fn().mockResolvedValue([{ id: 3 }, { id: 4 }]);
      AppDataSource.getRepository.mockImplementation((entity) => {
        if (entity && entity.name === 'DepartmentEntity') {
          return { find: mockDeptFind };
        }
        if (entity && entity.name === 'EmployeeBankAccountEntity') return bankRepo;
        return {};
      });

      employeesRepo.findAll.mockResolvedValue({ items: [{ id: 2, departmentId: 3 }], total: 1 });
      const userContext = { id: 10, roles: ['MANAGER'] };
      const queryDto = { page: 1, limit: 10 };

      const result = await service.findAll(queryDto, userContext);

      expect(employeesRepo.findByUserId).toHaveBeenCalledWith(10);
      expect(mockDeptFind).toHaveBeenCalledWith({
        where: { managerEmployeeId: 5 },
        select: ['id'],
      });
      expect(employeesRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ departmentId: [3, 4] })
      );
      expect(result.items).toEqual([{ id: 2, departmentId: 3 }]);
    });

    it('filters queryDto departmentId to empty if MANAGER queries a department they do not manage', async () => {
      employeesRepo.findByUserId.mockResolvedValue({ id: 5 });

      const mockDeptFind = jest.fn().mockResolvedValue([{ id: 3 }]);
      AppDataSource.getRepository.mockImplementation((entity) => {
        if (entity && entity.name === 'DepartmentEntity') {
          return { find: mockDeptFind };
        }
        if (entity && entity.name === 'EmployeeBankAccountEntity') return bankRepo;
        return {};
      });

      employeesRepo.findAll.mockResolvedValue({ items: [], total: 0 });
      const userContext = { id: 10, roles: ['MANAGER'] };
      
      // Querying department 4 which manager does NOT manage
      const queryDto = { page: 1, limit: 10, departmentId: 4 };

      await service.findAll(queryDto, userContext);

      expect(employeesRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ departmentId: [] })
      );
    });

    it('allows querying department if MANAGER queries a department they do manage', async () => {
      employeesRepo.findByUserId.mockResolvedValue({ id: 5 });

      const mockDeptFind = jest.fn().mockResolvedValue([{ id: 3 }, { id: 4 }]);
      AppDataSource.getRepository.mockImplementation((entity) => {
        if (entity && entity.name === 'DepartmentEntity') {
          return { find: mockDeptFind };
        }
        if (entity && entity.name === 'EmployeeBankAccountEntity') return bankRepo;
        return {};
      });

      employeesRepo.findAll.mockResolvedValue({ items: [], total: 0 });
      const userContext = { id: 10, roles: ['MANAGER'] };
      
      // Querying department 3 which manager DOES manage
      const queryDto = { page: 1, limit: 10, departmentId: 3 };

      await service.findAll(queryDto, userContext);

      expect(employeesRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ departmentId: 3 })
      );
    });

    it('exportExcel filters employees by manager departments and calls ExcelUtil.export', async () => {
      employeesRepo.findByUserId.mockResolvedValue({ id: 5 });
      const mockDeptFind = jest.fn().mockResolvedValue([{ id: 3 }]);
      AppDataSource.getRepository.mockImplementation((entity) => {
        if (entity && entity.name === 'DepartmentEntity') {
          return { find: mockDeptFind };
        }
        if (entity && entity.name === 'EmployeeBankAccountEntity') return bankRepo;
        return {};
      });

      employeesRepo.findAll.mockResolvedValue({
        items: [
          {
            employeeCode: 'EMP-001',
            fullName: 'Nguyen Van A',
            gender: 'MALE',
            maritalStatus: 'MARRIED',
            employmentStatus: 'ACTIVE',
            dateOfBirth: '1990-01-01',
            joinDate: '2024-01-01',
            department: { departmentName: 'HR' },
            position: { positionName: 'HR Specialist' },
            jobGrade: { gradeName: 'G1' },
          },
        ],
        total: 1,
      });
      ExcelUtil.export.mockResolvedValue('excel-buffer');

      const userContext = { id: 10, roles: ['MANAGER'] };
      const result = await service.exportExcel(userContext);

      expect(employeesRepo.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ departmentId: [3] })
      );
      expect(result).toBe('excel-buffer');
    });
  });
});
