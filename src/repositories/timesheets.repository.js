import { AppDataSource } from '../database/data-source.js';
import { TimeSheetEntity } from '../models/entities/time-sheet.entity.js';

export class TimesheetsRepository {
    constructor() {
        this.repository = AppDataSource.getRepository(TimeSheetEntity);
    }

    async findAll(options = {}) {
        const { skip = 0, take = 10, month, year, departmentId, status, search, employeeId, showTerminated } = options;
        const query = this.repository.createQueryBuilder('timesheet')
            .leftJoinAndSelect('timesheet.employee', 'employee')
            .leftJoinAndSelect('employee.department', 'department')
            .leftJoinAndSelect('employee.position', 'position')
            .where('timesheet.isDeleted = :isDeleted', { isDeleted: false });

        if (showTerminated === 'false' || showTerminated === false || showTerminated === undefined) {
            query.andWhere('employee.employmentStatus != :terminatedStatus', { terminatedStatus: 'TERMINATED' });
        }

        if (month && !isNaN(month)) {
            query.andWhere('timesheet.month = :month', { month });
        }

        if (year && !isNaN(year)) {
            query.andWhere('timesheet.year = :year', { year });
        }

        if (departmentId && !isNaN(departmentId)) {
            query.andWhere('employee.departmentId = :departmentId', { departmentId });
        }

        if (status === 'locked') {
            query.andWhere('timesheet.isLocked = :isLocked', { isLocked: true });
        } else if (status === 'unlocked') {
            query.andWhere('timesheet.isLocked = :isLocked', { isLocked: false });
        }

        if (employeeId && !isNaN(employeeId)) {
            query.andWhere('timesheet.employeeId = :employeeId', { employeeId });
        }

        if (search) {
            query.andWhere(
                '(LOWER(employee.fullName) LIKE BINARY :search OR employee.employeeCode LIKE :search)',
                { search: `%${search.toLowerCase()}%` }
            );
        }

        const [items, total] = await query
            .orderBy('employee.fullName', 'ASC')
            .skip(skip)
            .take(take)
            .getManyAndCount();

        return { items, total };
    }

    async findById(id) {
        return this.repository.findOne({
            where: { id, isDeleted: false },
            relations: ['employee', 'employee.department', 'employee.position'],
        });
    }

    async getPeriods(options = {}) {
        const query = this.repository.createQueryBuilder('timesheet')
            .select('timesheet.month', 'month')
            .addSelect('timesheet.year', 'year')
            .addSelect('COUNT(timesheet.id)', 'totalEmployees')
            .addSelect('SUM(CASE WHEN timesheet.isLocked = 1 THEN 1 ELSE 0 END)', 'lockedEmployees')
            .leftJoin('timesheet.employee', 'employee')
            .leftJoin('employee.department', 'department')
            .where('timesheet.isDeleted = :isDeleted', { isDeleted: false });

        if (options.year && !isNaN(options.year)) {
            query.andWhere('timesheet.year = :year', { year: options.year });
        }
        if (options.month && !isNaN(options.month)) {
            query.andWhere('timesheet.month = :month', { month: options.month });
        }
        if (options.departmentId && !isNaN(options.departmentId)) {
            query.andWhere('employee.departmentId = :departmentId', { departmentId: options.departmentId });
        }

        const groupByDepartment = options.groupByDepartment === true || options.groupByDepartment === 'true';
        if (groupByDepartment) {
            query.addSelect('department.id', 'departmentId')
                 .addSelect('department.departmentName', 'departmentName')
                 .groupBy('timesheet.year, timesheet.month, department.id, department.departmentName');
        } else {
            query.groupBy('timesheet.year, timesheet.month');
        }

        query.orderBy('timesheet.year', 'DESC')
             .addOrderBy('timesheet.month', 'DESC');
        if (groupByDepartment) {
            query.addOrderBy('department.departmentName', 'ASC');
        }

        const rawData = await query.getRawMany();
        return rawData.map(item => ({
            month: parseInt(item.month),
            year: parseInt(item.year),
            totalEmployees: parseInt(item.totalEmployees),
            lockedEmployees: parseInt(item.lockedEmployees),
            departmentId: item.departmentId !== null && item.departmentId !== undefined ? parseInt(item.departmentId) : null,
            departmentName: item.departmentName || null,
        }));
    }

    async findByEmployeeAndPeriod(employeeId, month, year) {
        return this.repository.findOne({
            where: { employeeId, month, year, isDeleted: false },
        });
    }

    async create(data) {
        const timesheet = this.repository.create(data);
        return this.repository.save(timesheet);
    }

    async bulkCreate(dataArray) {
        const timesheets = this.repository.create(dataArray);
        return this.repository.save(timesheets);
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
}
