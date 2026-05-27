import { ContractsRepository } from '../repositories/contracts.repository.js';
import { EmployeesRepository } from '../repositories/employees.repository.js';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '../common/exceptions/index.js';
import { AppMessages } from '../common/constants/index.js';
import { PaginatedResponseDto } from '../common/dto/index.js';
import { ExcelUtil } from '../common/utils/excel.util.js';
import { AppDataSource } from '../database/data-source.js';
import { DepartmentEntity } from '../models/entities/department.entity.js';
import { PositionEntity } from '../models/entities/position.entity.js';
import { JobGradeEntity } from '../models/entities/job-grade.entity.js';
import { ContractEntity } from '../models/entities/contract.entity.js';
import { EmployeeSalaryEntity } from '../models/entities/employee-salary.entity.js';
import { In } from 'typeorm';
import { NotificationsService } from './notifications.service.js';

export class ContractsService {
  constructor() {
    this.contractsRepository = new ContractsRepository();
    this.employeesRepository = new EmployeesRepository();
    this.notificationsService = new NotificationsService();
  }

  async _enrichContractsWithSalary(contracts = []) {
    if (!Array.isArray(contracts) || contracts.length === 0) {
      return [];
    }

    const employeeIds = [
      ...new Set(
        contracts
          .map((item) => Number(item.employeeId))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    ];

    if (employeeIds.length === 0) {
      return contracts;
    }

    const salaryRepo = AppDataSource.getRepository(EmployeeSalaryEntity);

    const activeSalaries = await salaryRepo.find({
      where: {
        employeeId: In(employeeIds),
        isDeleted: false,
        salaryStatus: 'ACTIVE',
      },
      relations: ['jobGrade'],
      order: {
        effectiveFrom: 'DESC',
        createdAt: 'DESC',
      },
    });

    const salaryMap = new Map();
    for (const salary of activeSalaries) {
      const employeeId = Number(salary.employeeId);
      if (!salaryMap.has(employeeId)) {
        salaryMap.set(employeeId, salary);
      }
    }

    return contracts.map((contract) => {
      const employee = contract.employee || {};
      const salary = salaryMap.get(Number(contract.employeeId));

      return {
        ...contract,
        employeeName: employee.fullName || null,
        departmentName: employee.department?.departmentName || null,
        positionName: employee.position?.positionName || null,
        jobGradeName: salary?.jobGrade?.name || employee.jobGrade?.name || null,
        baseSalary:
          salary?.baseSalary !== undefined && salary?.baseSalary !== null
            ? Number(salary.baseSalary)
            : null,
        performanceSalary:
          salary?.performanceSalary !== undefined &&
          salary?.performanceSalary !== null
            ? Number(salary.performanceSalary)
            : null,
        lunchAllowance:
          salary?.lunchAllowance !== undefined &&
          salary?.lunchAllowance !== null
            ? Number(salary.lunchAllowance)
            : null,
        fuelAllowance:
          salary?.fuelAllowance !== undefined && salary?.fuelAllowance !== null
            ? Number(salary.fuelAllowance)
            : null,
        phoneAllowance:
          salary?.phoneAllowance !== undefined &&
          salary?.phoneAllowance !== null
            ? Number(salary.phoneAllowance)
            : null,
        otherAllowance:
          salary?.otherAllowance !== undefined &&
          salary?.otherAllowance !== null
            ? Number(salary.otherAllowance)
            : null,
      };
    });
  }

  static CONTRACT_STATUSES = {
    DRAFT: 'DRAFT',
    PENDING: 'PENDING',
    NOT_EFFECTIVE: 'NOT_EFFECTIVE',
    ACTIVE: 'ACTIVE',
    SIGNED: 'SIGNED',
    TERMINATED: 'TERMINATED',
    EXPIRED: 'EXPIRED',
    CANCELLED: 'CANCELLED',
    CANCELED: 'CANCELED',
  };

  static EDITABLE_STATUSES = new Set([
    ContractsService.CONTRACT_STATUSES.DRAFT,
    ContractsService.CONTRACT_STATUSES.PENDING,
    ContractsService.CONTRACT_STATUSES.NOT_EFFECTIVE,
  ]);

  static LOCKED_MUTATION_STATUSES = new Set([
    ContractsService.CONTRACT_STATUSES.ACTIVE,
    ContractsService.CONTRACT_STATUSES.SIGNED,
    ContractsService.CONTRACT_STATUSES.TERMINATED,
    ContractsService.CONTRACT_STATUSES.EXPIRED,
  ]);

  static ALLOWED_STATUSES = new Set([
    ContractsService.CONTRACT_STATUSES.DRAFT,
    ContractsService.CONTRACT_STATUSES.PENDING,
    ContractsService.CONTRACT_STATUSES.NOT_EFFECTIVE,
    ContractsService.CONTRACT_STATUSES.ACTIVE,
    ContractsService.CONTRACT_STATUSES.SIGNED,
    ContractsService.CONTRACT_STATUSES.TERMINATED,
    ContractsService.CONTRACT_STATUSES.EXPIRED,
    ContractsService.CONTRACT_STATUSES.CANCELLED,
    ContractsService.CONTRACT_STATUSES.CANCELED,
  ]);

  static STATE_TRANSITIONS = {
    DRAFT: new Set(['PENDING', 'CANCELLED', 'CANCELED']),
    PENDING: new Set(['DRAFT', 'NOT_EFFECTIVE', 'CANCELLED', 'CANCELED']),
    NOT_EFFECTIVE: new Set(['PENDING', 'ACTIVE', 'CANCELLED', 'CANCELED']),
    ACTIVE: new Set(['SIGNED', 'TERMINATED', 'EXPIRED']),
    SIGNED: new Set(['TERMINATED', 'EXPIRED']),
    TERMINATED: new Set(),
    EXPIRED: new Set(),
    CANCELLED: new Set(),
    CANCELED: new Set(),
  };

  normalizeContractStatus(status) {
    return String(status || '')
      .trim()
      .toUpperCase();
  }

  ensureMutationAllowedStatus(contract, actionName) {
    const status = this.normalizeContractStatus(contract?.contractStatus);

    if (!ContractsService.ALLOWED_STATUSES.has(status)) {
      throw new BadRequestException(
        `Trạng thái hợp đồng không hợp lệ: ${status}`,
      );
    }

    if (
      ContractsService.LOCKED_MUTATION_STATUSES.has(status) ||
      !ContractsService.EDITABLE_STATUSES.has(status)
    ) {
      throw new BadRequestException(
        `Không được ${actionName} hợp đồng ở trạng thái ${status}`,
      );
    }
  }

  ensureValidStateTransition(currentStatus, nextStatus) {
    if (currentStatus === nextStatus) return;

    const nextCandidates = ContractsService.STATE_TRANSITIONS[currentStatus];
    if (!nextCandidates || !nextCandidates.has(nextStatus)) {
      throw new BadRequestException(
        `Không thể chuyển trạng thái hợp đồng từ ${currentStatus} sang ${nextStatus}`,
      );
    }
  }

  async ensureNotSelfContractOperation(contract, userId) {
    if (!userId) return;

    const actorEmployee = await this.employeesRepository.findByUserId(userId);
    if (!actorEmployee) return;

    if (Number(actorEmployee.id) === Number(contract.employeeId)) {
      throw new ForbiddenException(
        'Không được phép thao tác hợp đồng của chính mình',
      );
    }
  }

  _isBlockingContractForCreate(contract) {
    if (!contract || contract.isDeleted) return false;

    const now = new Date();
    const normalizedStatus = String(contract.contractStatus || '')
      .trim()
      .toUpperCase();
    const nonBlockingStatuses = new Set([
      'EXPIRED',
      'TERMINATED',
      'CANCELLED',
      'CANCELED',
    ]);

    // Treat contracts that are logically inactive as non-blocking,
    // even if scheduler/status sync hasn't run yet.
    if (nonBlockingStatuses.has(normalizedStatus)) return false;

    if (contract.endDate && new Date(contract.endDate) <= now) return false;

    if (contract.terminationDate && new Date(contract.terminationDate) <= now) {
      return false;
    }

    return true;
  }

  _normalizeContractNumber(value) {
    return String(value || '')
      .trim()
      .toUpperCase();
  }

  _buildExpectedContractNumber(employeeCode, signedDate) {
    const normalizedEmployeeCode = this._normalizeContractNumber(employeeCode);
    const referenceDate = signedDate ? new Date(signedDate) : new Date();
    const year = Number.isNaN(referenceDate.getTime())
      ? new Date().getFullYear()
      : referenceDate.getFullYear();

    return `HDLD/${year}/${normalizedEmployeeCode}`;
  }

  _validateCreateContractNumber(contractNumber, employee, signedDate) {
    const normalizedContractNumber = this._normalizeContractNumber(contractNumber);
    const expectedContractNumber = this._buildExpectedContractNumber(
      employee?.employeeCode,
      signedDate,
    );

    if (!employee?.employeeCode) {
      throw new BadRequestException(
        'Nhân viên chưa có mã nhân sự để tạo mã hợp đồng',
      );
    }

    if (normalizedContractNumber !== expectedContractNumber) {
      throw new BadRequestException(
        `Mã hợp đồng không đúng định dạng. Mã hợp đồng phải là ${expectedContractNumber}`,
      );
    }

    return expectedContractNumber;
  }

  async create(dto) {
    // validate employee
    const employee = await this.employeesRepository.findById(dto.employeeId);
    if (!employee) {
      throw new NotFoundException(AppMessages.Errors.Employee.NOT_FOUND);
    }

    dto.contractNumber = this._validateCreateContractNumber(
      dto.contractNumber,
      employee,
      dto.signedDate,
    );

    // prevent duplicates: employee cannot have another currently effective contract
    const existing = await this.contractsRepository.findByEmployeeId(
      dto.employeeId,
    );
    if (existing.some((c) => this._isBlockingContractForCreate(c))) {
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

    const createdContract = await this.contractsRepository.create(dto);

    try {
      const recipientUserId = Number(employee?.userId);
      if (Number.isFinite(recipientUserId) && recipientUserId > 0) {
        await this.notificationsService.createAndNotify({
          title: 'Bạn có hợp đồng mới',
          message: `Hợp đồng ${dto.contractNumber || ''} đã được tạo cho bạn. Vui lòng kiểm tra thông tin trong hồ sơ cá nhân.`,
          notificationType: 'WORKFLOW',
          link: '/settings/general#my-contracts',
          recipientUserIds: [recipientUserId],
        });
      }
    } catch (notificationError) {
      console.error(
        '[ContractsService] Failed to send contract notification:',
        notificationError,
      );
    }

    return createdContract;
  }

  async findAll(queryDto) {
    const [contracts, total] = await this.contractsRepository.findAll(queryDto);

    // validation: ensure no duplicate contractNumber among result set
    // this catches data integrity issues and surfaces 409 if found
    const seen = new Set();
    for (const c of contracts) {
      if (c.contractNumber) {
        if (seen.has(c.contractNumber)) {
          throw new ConflictException(
            'Đã phát hiện số hợp đồng trùng lặp trong dữ liệu: ' +
              c.contractNumber,
          );
        }
        seen.add(c.contractNumber);
      }
    }

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

  async findMyContracts(userId) {
    if (!userId) {
      throw new BadRequestException('Thiếu thông tin người dùng');
    }

    const employee = await this.employeesRepository.findByUserId(userId);
    if (!employee) {
      return [];
    }

    const contracts = await this.contractsRepository.findByEmployeeId(
      employee.id,
    );
    return this._enrichContractsWithSalary(contracts);
  }

  async update(id, updateDto, userId) {
    const currentContract = await this.findById(id);

    this.ensureMutationAllowedStatus(currentContract, 'cập nhật');
    await this.ensureNotSelfContractOperation(currentContract, userId);

    // contractNumber is immutable once created
    if (updateDto.contractNumber) {
      console.log('updateDto', updateDto);
      if (updateDto.contractNumber !== currentContract.contractNumber) {
        throw new BadRequestException('Không được phép thay đổi mã hợp đồng');
      }
      const existing = await this.contractsRepository.findByContractNumber(
        updateDto.contractNumber,
      );
      if (existing && existing.id !== id) {
        throw new ConflictException(AppMessages.Errors.Contract.ALREADY_EXISTS);
      }
    }
    // employee cannot be reassigned – only act if the field is present
    if (updateDto.employeeId !== undefined) {
      if (updateDto.employeeId !== currentContract.employeeId) {
        throw new BadRequestException(
          'Không được phép thay đổi nhân viên của hợp đồng',
        );
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
        gradeId = currentContract.jobGradeId;
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
      const startDate = new Date(
        updateDto.startDate || currentContract.startDate,
      );
      const endDate = new Date(updateDto.endDate);

      if (startDate >= endDate) {
        throw new BadRequestException('Ngày kết thúc phải sau ngày bắt đầu');
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

    if (updateDto.contractStatus !== undefined) {
      const currentStatus = this.normalizeContractStatus(
        currentContract.contractStatus,
      );
      const nextStatus = this.normalizeContractStatus(updateDto.contractStatus);

      if (!ContractsService.ALLOWED_STATUSES.has(nextStatus)) {
        throw new BadRequestException(
          `Trạng thái hợp đồng không hợp lệ: ${nextStatus}`,
        );
      }

      this.ensureValidStateTransition(currentStatus, nextStatus);
      updateDto.contractStatus = nextStatus;
    }

    return this.contractsRepository.update(id, updateDto);
  }

  async terminate(id, terminationData, userId) {
    const contract = await this.findById(id);
    const currentStatus = this.normalizeContractStatus(contract.contractStatus);

    if (!ContractsService.ALLOWED_STATUSES.has(currentStatus)) {
      throw new BadRequestException(
        `Trạng thái hợp đồng không hợp lệ: ${currentStatus}`,
      );
    }

    const disallowedTerminationStatuses = new Set([
      ContractsService.CONTRACT_STATUSES.TERMINATED,
      ContractsService.CONTRACT_STATUSES.EXPIRED,
      ContractsService.CONTRACT_STATUSES.CANCELLED,
      ContractsService.CONTRACT_STATUSES.CANCELED,
    ]);

    if (disallowedTerminationStatuses.has(currentStatus)) {
      throw new BadRequestException(
        `Không được chấm dứt hợp đồng ở trạng thái ${currentStatus}`,
      );
    }

    await this.ensureNotSelfContractOperation(contract, userId);

    if (String(contract.contractStatus || '').toUpperCase() === 'TERMINATED') {
      throw new BadRequestException('Hợp đồng đã được chấm dứt');
    }

    // validate termination payload
    if (!terminationData || !terminationData.terminationDate) {
      throw new BadRequestException('Ngày chấm dứt hợp đồng là bắt buộc');
    }
    if (
      !terminationData.terminationReason ||
      String(terminationData.terminationReason).trim() === ''
    ) {
      throw new BadRequestException('Lý do chấm dứt là bắt buộc');
    }
    const termDate = new Date(terminationData.terminationDate);
    if (isNaN(termDate.getTime())) {
      throw new BadRequestException('Ngày chấm dứt không hợp lệ');
    }
    // termination must not be before contract start
    if (contract.startDate) {
      const start = new Date(contract.startDate);
      if (termDate < start) {
        throw new BadRequestException(
          'Ngày chấm dứt không được trước ngày bắt đầu hợp đồng',
        );
      }
    }
    // termination cannot be in the future
    // allow future termination dates; the record will be updated later by a scheduler
    // (validation above already checked date is valid and not before start)

    if (
      terminationData.terminationCompensation !== undefined &&
      terminationData.terminationCompensation !== null
    ) {
      const comp = Number(terminationData.terminationCompensation);
      if (isNaN(comp) || comp < 0) {
        throw new BadRequestException('Bồi thường phải là số không âm');
      }
      const MAX_COMP = 50000000; // 50 triệu
      if (comp > MAX_COMP) {
        throw new BadRequestException(
          `Mức bồi thường không được vượt quá ${MAX_COMP}`,
        );
      }
      terminationData.terminationCompensation = comp;
    }

    // if termination date is in future we still record the info but status will not
    // yet be switched. The repository will handle conditional status update.
    return this.contractsRepository.terminate(id, terminationData, userId);
  }

  async remove(id, userId) {
    const contract = await this.findById(id);

    this.ensureMutationAllowedStatus(contract, 'xóa');
    await this.ensureNotSelfContractOperation(contract, userId);

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

    const employeeIds = [
      ...new Set(
        contracts
          .map((contract) => Number(contract.employeeId))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    ];

    const salaryByEmployeeId = new Map();
    if (employeeIds.length) {
      const salaries = await AppDataSource.getRepository(
        EmployeeSalaryEntity,
      ).find({
        where: {
          employeeId: In(employeeIds),
          isDeleted: false,
        },
        order: {
          effectiveFrom: 'DESC',
          createdAt: 'DESC',
        },
      });

      for (const salary of salaries) {
        const employeeId = Number(salary.employeeId);
        if (!salaryByEmployeeId.has(employeeId)) {
          salaryByEmployeeId.set(employeeId, []);
        }
        salaryByEmployeeId.get(employeeId).push(salary);
      }
    }

    const data = contracts.map((contract, index) => {
      const salary = this.pickSalaryForContract(
        contract,
        salaryByEmployeeId.get(Number(contract.employeeId)) || [],
      );
      const baseSalary = this.toExportNumber(salary?.baseSalary);
      const performanceSalary = this.toExportNumber(salary?.performanceSalary);
      const lunchAllowance = this.toExportNumber(salary?.lunchAllowance);
      const fuelAllowance = this.toExportNumber(salary?.fuelAllowance);
      const phoneAllowance = this.toExportNumber(salary?.phoneAllowance);
      const otherAllowance = this.toExportNumber(salary?.otherAllowance);

      return {
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
        baseSalary,
        performanceSalary,
        lunchAllowance,
        fuelAllowance,
        phoneAllowance,
        otherAllowance,
        totalIncome:
          baseSalary +
          performanceSalary +
          lunchAllowance +
          fuelAllowance +
          phoneAllowance +
          otherAllowance,
      };
    });

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
      { header: 'Lương cơ bản', key: 'baseSalary', width: 18 },
      { header: 'Lương KPI/Thưởng', key: 'performanceSalary', width: 18 },
      { header: 'Phụ cấp ăn trưa', key: 'lunchAllowance', width: 18 },
      { header: 'Phụ cấp xăng xe', key: 'fuelAllowance', width: 18 },
      { header: 'Phụ cấp điện thoại', key: 'phoneAllowance', width: 18 },
      { header: 'Phụ cấp khác', key: 'otherAllowance', width: 18 },
      { header: 'Tổng thu nhập', key: 'totalIncome', width: 18 },
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

  toExportNumber(value) {
    if (value === undefined || value === null || value === '') return 0;
    const numeric = Number(value);
    return Number.isNaN(numeric) ? 0 : numeric;
  }

  pickSalaryForContract(contract, salaries) {
    if (!Array.isArray(salaries) || salaries.length === 0) return null;

    const contractStart = contract?.startDate
      ? new Date(contract.startDate)
      : null;

    if (contractStart && !Number.isNaN(contractStart.getTime())) {
      const byDate = salaries.find((salary) => {
        const effectiveFrom = salary.effectiveFrom
          ? new Date(salary.effectiveFrom)
          : null;
        const effectiveTo = salary.effectiveTo
          ? new Date(salary.effectiveTo)
          : null;

        if (effectiveFrom && contractStart < effectiveFrom) return false;
        if (effectiveTo && contractStart > effectiveTo) return false;
        return true;
      });

      if (byDate) return byDate;
    }

    const activeSalary = salaries.find(
      (salary) => String(salary.salaryStatus || '').toUpperCase() === 'ACTIVE',
    );
    if (activeSalary) return activeSalary;

    return salaries[0];
  }

  async findByContractNumber(contractNumber) {
    return await this.contractsRepository.findOneByContractNumber(
      contractNumber,
    );
  }

  /**
   * Periodically check contracts with a termination date or end date that has arrived.
   * Terminates/Expires them automatically.
   */
  async processScheduledUpdates() {
    const repo = AppDataSource.getRepository(ContractEntity);
    const now = new Date();

    // activate contracts whose effective date has arrived
    await repo
      .createQueryBuilder()
      .update(ContractEntity)
      .set({ contractStatus: 'ACTIVE' })
      .where('startDate <= :now', { now })
      .andWhere('startDate IS NOT NULL')
      .andWhere('UPPER(contractStatus) = :notEffective', {
        notEffective: 'NOT_EFFECTIVE',
      })
      .andWhere('(terminationDate IS NULL OR terminationDate > :now)', { now })
      .execute();

    // apply terminations whose date has arrived and are not yet marked
    await repo
      .createQueryBuilder()
      .update(ContractEntity)
      .set({
        contractStatus: 'TERMINATED',
        terminatedAt: now,
      })
      .where('terminationDate <= :now', { now })
      .andWhere('terminationDate IS NOT NULL')
      .andWhere('UPPER(contractStatus) != :terminated', {
        terminated: 'TERMINATED',
      })
      .execute();

    // expire contracts that have passed their end date and are still active
    await repo
      .createQueryBuilder()
      .update(ContractEntity)
      .set({ contractStatus: 'EXPIRED' })
      .where('endDate <= :now', { now })
      .andWhere('endDate IS NOT NULL')
      .andWhere('UPPER(contractStatus) NOT IN (:...statuses)', {
        statuses: ['EXPIRED', 'TERMINATED'],
      })
      .execute();
  }
}
