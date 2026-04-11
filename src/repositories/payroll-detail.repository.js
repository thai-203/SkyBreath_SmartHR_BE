import { AppDataSource } from '../database/data-source.js';
import { PayrollDetailEntity } from '../models/entities/payroll-detail.entity.js';

export class PayrollDetailRepository {
    constructor() {
        this.repository = AppDataSource.getRepository(PayrollDetailEntity);
    }

    async findByPayroll(payrollId) {
        return this.repository.createQueryBuilder('detail')
            .leftJoinAndSelect('detail.employee', 'employee')
            .leftJoinAndSelect('employee.department', 'department')
            .leftJoinAndSelect('employee.position', 'position')
            .leftJoinAndSelect('employee.user', 'user')
            .where('detail.payrollId = :payrollId', { payrollId })
            .andWhere('detail.isDeleted = :isDeleted', { isDeleted: false })
            .orderBy('employee.fullName', 'ASC')
            .getMany();
    }

    async findByPayrollAndDepartment(payrollId, departmentId) {
        return this.repository.createQueryBuilder('detail')
            .leftJoinAndSelect('detail.employee', 'employee')
            .leftJoinAndSelect('employee.department', 'department')
            .leftJoinAndSelect('employee.position', 'position')
            .where('detail.payrollId = :payrollId', { payrollId })
            .andWhere('detail.isDeleted = :isDeleted', { isDeleted: false })
            .andWhere('employee.departmentId = :departmentId', { departmentId })
            .orderBy('employee.fullName', 'ASC')
            .getMany();
    }

    async findById(id) {
        return this.repository.findOne({
            where: { id, isDeleted: false },
            relations: ['employee', 'employee.department'],
        });
    }

    async findByPayrollAndEmployee(payrollId, employeeId) {
        return this.repository.findOne({
            where: { payrollId, employeeId, isDeleted: false },
        });
    }

    async findByPayrollAndEmployeeCode(payrollId, employeeCode) {
        return this.repository.createQueryBuilder('detail')
            .leftJoinAndSelect('detail.employee', 'employee')
            .where('detail.payrollId = :payrollId', { payrollId })
            .andWhere('employee.employeeCode = :employeeCode', { employeeCode })
            .andWhere('detail.isDeleted = :isDeleted', { isDeleted: false })
            .getOne();
    }

    async create(data) {
        const detail = this.repository.create(data);
        return this.repository.save(detail);
    }

    async bulkCreate(dataArray) {
        const details = this.repository.create(dataArray);
        return this.repository.save(details);
    }

    async update(id, data) {
        await this.repository.update(id, data);
        return this.findById(id);
    }

    async bulkUpdateSentAt(payrollId, sentAt) {
        return this.repository.createQueryBuilder()
            .update(PayrollDetailEntity)
            .set({ payslipSentAt: sentAt })
            .where('payroll_id = :payrollId', { payrollId })
            .andWhere('is_deleted = :isDeleted', { isDeleted: false })
            .execute();
    }
}
