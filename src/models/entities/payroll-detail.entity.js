import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { PayrollEntity } from './payroll.entity.js';
import { EmployeeEntity } from './employee.entity.js';

@Entity('payroll_details')
export class PayrollDetailEntity extends BaseEntity {
    @Column({ name: 'payroll_id', type: 'int' })
    payrollId;

    @Column({ name: 'employee_id', type: 'int' })
    employeeId;

    @Column({ name: 'base_salary', type: 'decimal', precision: 15, scale: 2 })
    baseSalary;

    @Column({ name: 'overtime_pay', type: 'decimal', precision: 15, scale: 2, default: 0 })
    overtimePay;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    bonus;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    penalty;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    deduction;

    @Column({ name: 'net_salary', type: 'decimal', precision: 15, scale: 2 })
    netSalary;

    @Column({ name: 'insurance_deduction', type: 'decimal', precision: 15, scale: 2, default: 0 })
    insuranceDeduction;

    @Column({ name: 'tax_deduction', type: 'decimal', precision: 15, scale: 2, default: 0 })
    taxDeduction;

    @ManyToOne(() => PayrollEntity)
    @JoinColumn({ name: 'payroll_id' })
    payroll;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'employee_id' })
    employee;
}
