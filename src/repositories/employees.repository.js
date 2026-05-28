import { AppDataSource } from '../database/data-source.js';
import { EmployeeEntity } from '../models/entities/employee.entity.js';
import { Between, In } from 'typeorm';

export class EmployeesRepository {
  constructor() {
    this.repository = AppDataSource.getRepository(EmployeeEntity);
  }

  _excludeInactiveEmployees(query, alias = 'employee') {
    query.andWhere(
      `COALESCE(UPPER(${alias}.employmentStatus), '') != :inactiveStatus`,
      {
        inactiveStatus: 'INACTIVE',
      },
    );
  }

  async create(data) {
    const employee = this.repository.create(data);
    return this.repository.save(employee);
  }

  async findAll(options = {}) {
    const {
      skip = 0,
      limit = 10,
      search = '',
      departmentId,
      positionId,
      employmentStatus,
      excludeInactive = false,
    } = options;

    const take = limit;
    const query = this.repository
      .createQueryBuilder('employee')
      .leftJoinAndSelect('employee.user', 'user')
      .leftJoinAndSelect('employee.department', 'department')
      .leftJoinAndSelect('employee.position', 'position')
      .leftJoinAndSelect('employee.jobGrade', 'jobGrade')
      .leftJoinAndSelect('employee.directManager', 'directManager')
      .leftJoinAndSelect('employee.hrMentor', 'hrMentor')
      .where('employee.isDeleted = :isDeleted', { isDeleted: false });

    if (search) {
      query.andWhere(
        '(employee.fullName LIKE :search OR employee.employeeCode LIKE :search OR employee.companyEmail LIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (departmentId) {
      query.andWhere('employee.departmentId = :departmentId', { departmentId });
    }

    if (positionId) {
      query.andWhere('employee.positionId = :positionId', { positionId });
    }

    if (employmentStatus) {
      query.andWhere('employee.employmentStatus = :employmentStatus', {
        employmentStatus,
      });
    }

    if (excludeInactive) {
      this._excludeInactiveEmployees(query);
    }

    const [items, total] = await query
      .orderBy('employee.fullName', 'ASC')
      .skip(skip)
      .take(take)
      .getManyAndCount();

    return { items, total };
  }

  /**
   * Get a dropdown-friendly list of employees.
   * @param {string=} roleName optional filter by role
   * @param {boolean=} excludeWithContract when true excludes employees having
   *        an active, non‑deleted contract
   */
  async findDropdownList(roleName, excludeWithContract = false, options = {}) {
    const { excludeInactive = false } = options;

    const query = this.repository
      .createQueryBuilder('employee')
      .leftJoin('employee.user', 'user')
      .leftJoin('user.userRoles', 'userRole')
      .leftJoin('userRole.role', 'role')
      .where('employee.isDeleted = :isDeleted', { isDeleted: false });

    if (roleName) {
      query.andWhere('LOWER(role.roleName) = :roleName', {
        roleName: roleName.toLowerCase(),
      });
    }

    if (excludeWithContract) {
      // join contracts and ensure none match
      query.leftJoin(
        'contracts',
        'contract',
        'contract.employee_id = employee.id AND contract.isDeleted = false AND contract.contract_status = :status',
        { status: 'ACTIVE' },
      );
      query.andWhere('contract.id IS NULL');
    }

    if (excludeInactive) {
      this._excludeInactiveEmployees(query);
    }

    return query
      .distinct(true)
      .select([
        'employee.id',
        'employee.fullName',
        'employee.avatar',
        'employee.departmentId',
        'employee.employeeCode',
      ])
      .orderBy('employee.fullName', 'ASC')
      .getMany();
  }

  async findById(id) {
    return this.repository.findOne({
      where: { id, isDeleted: false },
      relations: [
        'user',
        'department',
        'position',
        'jobGrade',
        'directManager',
        'hrMentor',
      ],
    });
  }

  async findByUserId(id) {
    return this.repository.findOne({
      where: { userId: id, isDeleted: false },
    });
  }

  async findByIds(ids) {
    if (!ids || ids.length === 0) return [];
    return this.repository.find({
      where: {
        id: In(ids),
        isDeleted: false,
      },
      relations: ['user', 'department'],
    });
  }

  async update(id, data) {
    await this.repository.update(id, data);
    return this.findById(id);
  }

  async softDelete(id) {
    return this.repository.update(id, {
      isDeleted: true,
      deletedAt: new Date(),
    });
  }

  async findByField(field, value, excludeId = null) {
    const query = this.repository
      .createQueryBuilder('employee')
      .where(`employee.${field} = :value`, { value })
      .andWhere('employee.isDeleted = :isDeleted', { isDeleted: false });

    if (excludeId) {
      query.andWhere('employee.id != :excludeId', { excludeId });
    }

    return query.getOne();
  }
  async findValidationData() {
    return this.repository.find({
      where: { isDeleted: false },
      select: [
        'id',
        'employeeCode',
        'fullName',
        'personalEmail',
        'companyEmail',
        'phoneNumber',
        'nationalId',
      ],
    });
  }

  async getEmployeeNoPlanId(options = {}) {
    const { excludeInactive = false } = options;

    const query = this.repository
      .createQueryBuilder('employee')
      .leftJoinAndSelect('employee.user', 'user')
      .leftJoinAndSelect('employee.department', 'department')
      .leftJoinAndSelect('employee.position', 'position')
      .leftJoinAndSelect('employee.jobGrade', 'jobGrade')
      .leftJoinAndSelect('employee.directManager', 'directManager')
      .leftJoinAndSelect('employee.hrMentor', 'hrMentor')
      .where('employee.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('employee.planId IS NULL');

    if (excludeInactive) {
      this._excludeInactiveEmployees(query);
    }

    return query.getMany();
  }

  async getByUserId(userId) {
    return this.repository.findOne({
      where: {
        isDeleted: false,
        userId: userId,
      },
      relations: [
        'user',
        'department',
        'position',
        'jobGrade',
        'directManager',
        'hrMentor',
      ],
    });
  }

  async count() {
    return this.repository.count({ where: { isDeleted: false } });
  }

  async countByCreatedAtRange(start, end) {
    return this.repository.count({
      where: {
        isDeleted: false,
        createdAt: Between(start, end),
      },
    });
  }

  async findByRoleNames(roleNames) {
    if (!roleNames || roleNames.length === 0) return [];
    // Use lowercase comparison to avoid case issues and avoid duplicate employees
    const normalizedRoles = roleNames.map((r) => r.toLowerCase());

    return this.repository
      .createQueryBuilder('employee')
      .leftJoinAndSelect('employee.user', 'user')
      .leftJoinAndSelect('user.userRoles', 'userRole')
      .leftJoinAndSelect('userRole.role', 'role')
      .leftJoinAndSelect('employee.department', 'department')
      .where('LOWER(role.roleName) IN (:...roleNames)', {
        roleNames: normalizedRoles,
      })
      .andWhere('employee.isDeleted = :isDeleted', { isDeleted: false })
      .distinct(true)
      .getMany();
  }
}
