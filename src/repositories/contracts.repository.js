import { AppDataSource } from '../database/data-source.js';
import { ContractEntity } from '../models/entities/contract.entity.js';
import { EmployeeEntity } from '../models/entities/employee.entity.js';
import { EmployeeSalaryEntity } from '../models/entities/employee-salary.entity.js';
import { Like } from 'typeorm';

export class ContractsRepository {
  constructor() {
    this.dataSource = AppDataSource;
    this.repository = AppDataSource.getRepository(ContractEntity);
  }

  async create(data) {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const initialStatus = String(
        data.contractStatus ?? 'NOT_EFFECTIVE',
      ).toUpperCase();

      const contract = queryRunner.manager.create(ContractEntity, {
        employeeId: data.employeeId,
        departmentId: data.departmentId ?? null,
        departmentName: data.departmentName ?? null,
        positionId: data.positionId ?? null,
        positionName: data.positionName ?? null,
        jobGradeId: data.jobGradeId ?? null,
        jobGradeName: data.jobGradeName ?? null,
        contractNumber: data.contractNumber,
        contractType: data.contractType,
        startDate: data.startDate,
        endDate: data.endDate,
        contractStatus: initialStatus,
        signedDate: data.signedDate,
        workingHours: data.workingHours ?? 8,
        attachments: data.attachments,
        note: data.note,
      });

      const savedContract = await queryRunner.manager.save(contract);

      // Soft delete old salary records for this employee
      await queryRunner.manager.update(
        EmployeeSalaryEntity,
        {
          employeeId: data.employeeId,
          isDeleted: false,
        },
        {
          isDeleted: true,
          deletedAt: new Date(),
        },
      );

      const employeeSalary = queryRunner.manager.create(EmployeeSalaryEntity, {
        employeeId: data.employeeId,
        jobGradeId: data.jobGradeId,

        baseSalary: data.baseSalary,
        performanceSalary: data.performanceSalary ?? 0,
        lunchAllowance: data.lunchAllowance ?? 0,
        fuelAllowance: data.fuelAllowance ?? 0,
        phoneAllowance: data.phoneAllowance ?? 0,
        otherAllowance: data.otherAllowance ?? 0,

        salaryType: data.salaryType ?? '1',
        salaryStatus: 'ACTIVE',
        effectiveFrom: data.startDate,
        effectiveTo: data.endDate,
      });

      await queryRunner.manager.save(employeeSalary);

      await queryRunner.manager.update(
        EmployeeEntity,
        { id: data.employeeId },
        {
          departmentId: data.departmentId,
          positionId: data.positionId,
          jobGradeId: data.jobGradeId,
          employmentStatus: 'ACTIVE',
        },
      );

      await queryRunner.commitTransaction();
      return savedContract;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async findAll(queryDto) {
    const {
      skip,
      limit,
      sortBy,
      sortOrder,
      search,
      contractStatus,
      contractType,
      employeeId,
    } = queryDto;

    const order = sortBy
      ? { [sortBy]: sortOrder || 'DESC' }
      : { createdAt: 'DESC' };

    const baseWhere = {
      isDeleted: false,
    };

    if (contractStatus) {
      baseWhere.contractStatus = contractStatus;
    }

    if (contractType) {
      baseWhere.contractType = contractType;
    }

    if (employeeId && !Number.isNaN(Number(employeeId))) {
      baseWhere.employeeId = Number(employeeId);
    }

    let where = baseWhere;

    if (search) {
      where = [
        {
          ...baseWhere,
          contractNumber: Like(`%${search}%`),
        },
        {
          ...baseWhere,
          employee: {
            fullName: Like(`%${search}%`),
          },
        },
      ];
    }

    return this.repository.findAndCount({
      where,
      relations: [
        'employee',
        'employee.user',
        'employee.department',
        'employee.position',
        'employee.jobGrade',
        'department',
        'position',
        'jobGrade',
      ],
      order,
      skip,
      take: limit,
    });
  }

  async findById(id) {
    return this.repository.findOne({
      where: { id, isDeleted: false },
      relations: [
        'employee',
        'employee.user',
        'employee.department',
        'employee.position',
        'employee.jobGrade',
        'department',
        'position',
        'jobGrade',
      ],
    });
  }

  async findByEmployeeId(employeeId) {
    return this.repository.find({
      where: { employeeId, isDeleted: false },
      relations: [
        'employee',
        'employee.user',
        'employee.department',
        'employee.position',
        'employee.jobGrade',
        'department',
        'position',
        'jobGrade',
      ],
      order: { startDate: 'DESC' },
    });
  }

  async update(id, data) {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const contract = await queryRunner.manager.findOne(ContractEntity, {
        where: { id, isDeleted: false },
      });

      if (!contract) {
        throw new Error('Contract not found');
      }

      await queryRunner.manager.update(
        ContractEntity,
        { id },
        {
          departmentId:
            data.departmentId !== undefined
              ? data.departmentId
              : contract.departmentId,
          departmentName:
            data.departmentName !== undefined
              ? data.departmentName
              : contract.departmentName,
          positionId:
            data.positionId !== undefined
              ? data.positionId
              : contract.positionId,
          positionName:
            data.positionName !== undefined
              ? data.positionName
              : contract.positionName,
          jobGradeId:
            data.jobGradeId !== undefined
              ? data.jobGradeId
              : contract.jobGradeId,
          jobGradeName:
            data.jobGradeName !== undefined
              ? data.jobGradeName
              : contract.jobGradeName,
          contractType: data.contractType ?? contract.contractType,
          startDate: data.startDate ?? contract.startDate,
          endDate: data.endDate ?? contract.endDate,
          signedDate: data.signedDate ?? contract.signedDate,
          workingHours: data.workingHours ?? contract.workingHours,
          contractStatus:
            data.contractStatus !== undefined
              ? String(data.contractStatus).toUpperCase()
              : contract.contractStatus,
          attachments:
            data.attachments !== undefined
              ? data.attachments
              : contract.attachments,

          note: data.note,
        },
      );

      if (
        data.departmentId !== undefined ||
        data.positionId !== undefined ||
        data.jobGradeId !== undefined
      ) {
        await queryRunner.manager.update(
          EmployeeEntity,
          { id: contract.employeeId },
          {
            departmentId: data.departmentId ?? undefined,
            positionId: data.positionId ?? undefined,
            jobGradeId: data.jobGradeId ?? undefined,
          },
        );
      }

      const currentSalary = await queryRunner.manager.findOne(
        EmployeeSalaryEntity,
        {
          where: {
            employeeId: contract.employeeId,
            salaryStatus: 'ACTIVE',
          },
        },
      );

      if (currentSalary) {
        const hasSalaryChange =
          (data.baseSalary !== undefined &&
            data.baseSalary !== currentSalary.baseSalary) ||
          (data.performanceSalary !== undefined &&
            data.performanceSalary !== currentSalary.performanceSalary) ||
          (data.lunchAllowance !== undefined &&
            data.lunchAllowance !== currentSalary.lunchAllowance) ||
          (data.fuelAllowance !== undefined &&
            data.fuelAllowance !== currentSalary.fuelAllowance) ||
          (data.phoneAllowance !== undefined &&
            data.phoneAllowance !== currentSalary.phoneAllowance) ||
          (data.otherAllowance !== undefined &&
            data.otherAllowance !== currentSalary.otherAllowance) ||
          (data.salaryType !== undefined &&
            data.salaryType !== currentSalary.salaryType);

        if (hasSalaryChange) {
          await queryRunner.manager.update(
            EmployeeSalaryEntity,
            { id: currentSalary.id },
            {
              salaryStatus: 'INACTIVE',
              effectiveTo: new Date(),
            },
          );

          const newSalary = queryRunner.manager.create(EmployeeSalaryEntity, {
            employeeId: contract.employeeId,
            jobGradeId: data.jobGradeId ?? currentSalary.jobGradeId,

            baseSalary: data.baseSalary ?? currentSalary.baseSalary,
            performanceSalary:
              data.performanceSalary ?? currentSalary.performanceSalary,
            lunchAllowance: data.lunchAllowance ?? currentSalary.lunchAllowance,
            fuelAllowance: data.fuelAllowance ?? currentSalary.fuelAllowance,
            phoneAllowance: data.phoneAllowance ?? currentSalary.phoneAllowance,
            otherAllowance: data.otherAllowance ?? currentSalary.otherAllowance,

            salaryType: data.salaryType ?? currentSalary.salaryType,

            salaryStatus: 'ACTIVE',
            effectiveFrom: data.startDate ?? new Date(),
            effectiveTo: data.endDate ?? null,
          });

          await queryRunner.manager.save(newSalary);
        }
      }

      await queryRunner.commitTransaction();

      return await this.findById(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async terminate(id, data, userId) {
    const queryRunner = this.dataSource.createQueryRunner();

    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const contract = await queryRunner.manager.findOne(ContractEntity, {
        where: { id, isDeleted: false },
      });

      if (!contract) {
        throw new Error('Contract not found');
      }

      // if the contract already has a termination date in the past and status
      // is already terminated we simply disallow
      if (
        String(contract.contractStatus || '').toUpperCase() === 'TERMINATED'
      ) {
        throw new Error('Contract already terminated');
      }

      if (!data.terminationDate || !data.terminationReason) {
        throw new Error('terminationDate and terminationReason are required');
      }

      const termDate = new Date(data.terminationDate);
      const now = new Date();

      // build update object; don't flip status for future-dated terminations
      const updateData = {
        terminationDate: data.terminationDate,
        terminationReason: data.terminationReason,
        terminationCompensation: data.terminationCompensation ?? 0,
        terminationNote: data.terminationNote ?? null,
        terminatedBy: userId,
      };

      if (termDate <= now) {
        updateData.contractStatus = 'TERMINATED';
        updateData.terminatedAt = now;
        updateData.terminatedBy = userId;
      }

      await queryRunner.manager.update(ContractEntity, { id }, updateData);

      await queryRunner.commitTransaction();
      return this.findById(id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async delete(id) {
    await this.repository.update(id, {
      isDeleted: true,
      deletedAt: new Date(),
    });
  }

  async findByContractNumber(contractNumber) {
    return this.repository.findOne({
      where: { contractNumber, isDeleted: false },
    });
  }

  async findByStatus(status) {
    return this.repository.find({
      where: { contractStatus: status, isDeleted: false },
      relations: ['employee', 'department', 'position', 'jobGrade'],
    });
  }

  async findOneByContractNumber(contractNumber) {
    return await this.repository.findOne({
      where: {
        contractNumber,
        isDeleted: false,
      },
    });
  }
}
