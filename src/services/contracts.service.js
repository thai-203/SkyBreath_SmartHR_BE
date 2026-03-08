import { ContractsRepository } from '../repositories/contracts.repository.js';
import { EmployeesRepository } from '../repositories/employees.repository.js';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '../common/exceptions/index.js';
import { AppMessages } from '../common/constants/index.js';
import { PaginatedResponseDto } from '../common/dto/index.js';
import { ExcelUtil } from '../common/utils/excel.util.js';
import { AppDataSource } from '../database/data-source.js';
import { DepartmentEntity } from '../models/entities/department.entity.js';
import { PositionEntity } from '../models/entities/position.entity.js';
import { JobGradeEntity } from '../models/entities/job-grade.entity.js';

export class ContractsService {
  constructor() {
    this.contractsRepository = new ContractsRepository();
    this.employeesRepository = new EmployeesRepository();
  }

  async create(dto) {
    // validate employee
    const employee = await this.employeesRepository.findById(dto.employeeId);
    if (!employee) {
      throw new NotFoundException(AppMessages.Errors.Employee.NOT_FOUND);
    }

    // prevent duplicates: employee cannot have another active contract
    const existing = await this.contractsRepository.findByEmployeeId(
      dto.employeeId,
    );
    if (existing.some((c) => c.contractStatus === 'ACTIVE' && !c.isDeleted)) {
      throw new ConflictException('Nhân viên đã có hợp đồng đang hoạt động');
    }

    // require related ids (frontend already enforces, but double check)
    if (!dto.departmentId) {
      throw new BadRequestException('Phòng ban là bắt buộc');
    }
    if (!dto.positionId) {
      throw new BadRequestException('Vị trí là bắt buộc');
    }
    if (!dto.jobGradeId) {
      throw new BadRequestException('Ngạch lương là bắt buộc');
    }

    // validate related ids exist
    const deptExists = await AppDataSource.getRepository(
      DepartmentEntity,
    ).findOne({ where: { id: dto.departmentId, isDeleted: false } });
    if (!deptExists) {
      throw new BadRequestException('Phòng ban không tồn tại');
    }
    const posExists = await AppDataSource.getRepository(PositionEntity).findOne(
      { where: { id: dto.positionId, isDeleted: false } },
    );
    if (!posExists) {
      throw new BadRequestException('Vị trí không tồn tại');
    }
    const gradeExists = await AppDataSource.getRepository(
      JobGradeEntity,
    ).findOne({ where: { id: dto.jobGradeId, isDeleted: false } });
    if (!gradeExists) {
      throw new BadRequestException('Ngạch lương không tồn tại');
    }

    // ensure baseSalary fits grade range
    if (dto.baseSalary !== undefined && dto.baseSalary !== null) {
      const min = Number(gradeExists.minSalary || 0);
      const max = Number(gradeExists.maxSalary || Infinity);
      if (dto.baseSalary < min || dto.baseSalary > max) {
        throw new BadRequestException(
          `Lương cơ bản phải nằm trong khoảng ${min} - ${max}`,
        );
      }
    }

    // date validations
    if (dto.endDate) {
      const start = new Date(dto.startDate);
      const end = new Date(dto.endDate);
      if (start >= end) {
        throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu');
      }
    }
    if (dto.signedDate && dto.startDate) {
      const signed = new Date(dto.signedDate);
      const start = new Date(dto.startDate);
      if (signed > start) {
        throw new BadRequestException(
          'Ngày ký hợp đồng không thể sau ngày bắt đầu',
        );
      }
    }

    return this.contractsRepository.create(dto);
  }

  async findAll(queryDto) {
    const [contracts, total] = await this.contractsRepository.findAll(queryDto);
    return new PaginatedResponseDto(contracts, total, queryDto);
  }

  async findById(id) {
    const contract = await this.contractsRepository.findById(id);
    if (!contract) {
      throw new NotFoundException(AppMessages.Errors.Contract.NOT_FOUND);
    }
    return contract;
  }

  async findByEmployeeId(employeeId) {
    const employee = await this.employeesRepository.findById(employeeId);
    if (!employee) {
      throw new NotFoundException(AppMessages.Errors.Employee.NOT_FOUND);
    }

    return this.contractsRepository.findByEmployeeId(employeeId);
  }

  async update(id, updateDto) {
    await this.findById(id);
    if (updateDto.contractNumber) {
      const existing = await this.contractsRepository.findByContractNumber(
        updateDto.contractNumber,
      );
      if (existing && existing.id !== id) {
        throw new ConflictException(AppMessages.Errors.Contract.ALREADY_EXISTS);
      }
    }

    // verify provided relations
    if (updateDto.departmentId) {
      const exists = await AppDataSource.getRepository(
        DepartmentEntity,
      ).findOne({ where: { id: updateDto.departmentId, isDeleted: false } });
      if (!exists) {
        throw new BadRequestException('Phòng ban không tồn tại');
      }
    }
    if (updateDto.positionId) {
      const exists = await AppDataSource.getRepository(PositionEntity).findOne({
        where: { id: updateDto.positionId, isDeleted: false },
      });
      if (!exists) {
        throw new BadRequestException('Vị trí không tồn tại');
      }
    }
    if (updateDto.jobGradeId) {
      const exists = await AppDataSource.getRepository(JobGradeEntity).findOne({
        where: { id: updateDto.jobGradeId, isDeleted: false },
      });
      if (!exists) {
        throw new BadRequestException('Ngạch lương không tồn tại');
      }
    }

    // salary range based on grade (use updated grade if provided else existing)
    if (updateDto.baseSalary !== undefined) {
      let gradeId = updateDto.jobGradeId;
      if (!gradeId) {
        const existingContract = await this.findById(id);
        gradeId = existingContract.jobGradeId;
      }
      if (gradeId) {
        const grade = await AppDataSource.getRepository(JobGradeEntity).findOne(
          { where: { id: gradeId, isDeleted: false } },
        );
        if (grade) {
          const min = Number(grade.minSalary || 0);
          const max = Number(grade.maxSalary || Infinity);
          if (updateDto.baseSalary < min || updateDto.baseSalary > max) {
            throw new BadRequestException(
              `Lương cơ bản phải nằm trong khoảng ${min} - ${max}`,
            );
          }
        }
      }
    }

    // Validate dates
    if (updateDto.endDate) {
      const contract = await this.findById(id);
      const startDate = new Date(updateDto.startDate || contract.startDate);
      const endDate = new Date(updateDto.endDate);

      if (startDate >= endDate) {
        throw new BadRequestException('End date must be after start date');
      }
    }
    if (updateDto.signedDate && updateDto.startDate) {
      const signed = new Date(updateDto.signedDate);
      const startDate = new Date(updateDto.startDate);
      if (signed > startDate) {
        throw new BadRequestException(
          'Ngày ký hợp đồng không thể sau ngày bắt đầu',
        );
      }
    }
    return this.contractsRepository.update(id, updateDto);
  }

  async terminate(id, terminationData, userId) {
    const contract = await this.findById(id);

    if (contract.contractStatus === 'terminated') {
      throw new BadRequestException('Hợp đồng đã được chấm dứt');
    }

    return this.contractsRepository.terminate(id, terminationData, userId);
  }

  async remove(id) {
    await this.findById(id);
    await this.contractsRepository.delete(id);
  }

  async searchContracts(keyword) {
    if (!keyword || keyword.trim().length === 0) {
      throw new BadRequestException('Từ khóa tìm kiếm không thể để trống');
    }

    return this.contractsRepository.search(keyword);
  }

  async getContractsByStatus(status) {
    return this.contractsRepository.findByStatus(status);
  }

  async getExpiredContracts() {
    return this.contractsRepository.findExpiredContracts();
  }

  async exportExcel(queryDto) {
    // Get all contracts matching query
    const queryDtoForExport = { ...queryDto, limit: 10000, page: 1 };
    const [contracts] =
      await this.contractsRepository.findAll(queryDtoForExport);

    const data = contracts.map((contract, index) => ({
      index: index + 1,
      contractNumber: contract.contractNumber,
      employeeName: contract.employee?.fullName || '',
      department: contract.employee?.department?.departmentName || '',
      position: contract.employee?.position?.positionName || '',
      contractType: contract.contractType,
      startDate: this.formatDate(contract.startDate),
      endDate: contract.endDate ? this.formatDate(contract.endDate) : 'N/A',
      workingHours: contract.workingHours || '',
      contractStatus: contract.contractStatus,
      signedDate: contract.signedDate
        ? this.formatDate(contract.signedDate)
        : '',
    }));

    const columns = [
      { header: 'STT', key: 'index', width: 8 },
      { header: 'Mã hợp đồng', key: 'contractNumber', width: 20 },
      { header: 'Tên nhân viên', key: 'employeeName', width: 25 },
      { header: 'Phòng ban', key: 'department', width: 20 },
      { header: 'Vị trí', key: 'position', width: 20 },
      { header: 'Loại hợp đồng', key: 'contractType', width: 15 },
      { header: 'Ngày bắt đầu', key: 'startDate', width: 15 },
      { header: 'Ngày kết thúc', key: 'endDate', width: 15 },
      { header: 'Giờ làm việc', key: 'workingHours', width: 12 },
      { header: 'Trạng thái', key: 'contractStatus', width: 15 },
      { header: 'Ngày ký', key: 'signedDate', width: 15 },
    ];

    return ExcelUtil.export(data, columns, 'Danh sách hợp đồng');
  }

  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  async findByContractNumber(contractNumber) {
    return await this.contractsRepository.findOneByContractNumber(
      contractNumber,
    );
  }
}
