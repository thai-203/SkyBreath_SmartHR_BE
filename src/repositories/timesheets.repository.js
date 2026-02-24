import { AppDataSource } from '../database/data-source.js';
import { TimeSheetEntity } from '../models/entities/time-sheet.entity.js';

export class TimesheetsRepository {
    constructor() {
        this.repository = AppDataSource.getRepository(TimeSheetEntity);
    }

    async findAll(options = {}) {
        const { skip = 0, take = 10, month, year, departmentId, status, search } = options;
        const query = this.repository.createQueryBuilder('timesheet')
            .leftJoinAndSelect('timesheet.employee', 'employee')
            .leftJoinAndSelect('employee.department', 'department')
            .leftJoinAndSelect('employee.position', 'position')
            .where('timesheet.isDeleted = :isDeleted', { isDeleted: false });

        if (month) {
            query.andWhere('timesheet.month = :month', { month });
        }

        if (year) {
            query.andWhere('timesheet.year = :year', { year });
        }

        if (departmentId) {
            query.andWhere('employee.departmentId = :departmentId', { departmentId });
        }

        if (status === 'locked') {
            query.andWhere('timesheet.isLocked = :isLocked', { isLocked: true });
        } else if (status === 'unlocked') {
            query.andWhere('timesheet.isLocked = :isLocked', { isLocked: false });
        }

        if (search) {
            query.andWhere(
                '(employee.fullName LIKE :search OR employee.employeeCode LIKE :search)',
                { search: `%${search}%` }
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
