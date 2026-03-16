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

    @Column({ name: 'working_days', type: 'decimal', precision: 5, scale: 2, default: 0 })
    workingDays;

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

    @Column({ name: 'note', type: 'text', nullable: true })
    note;

    @Column({ name: 'payslip_sent_at', type: 'datetime', nullable: true })
    payslipSentAt;

    @ManyToOne(() => PayrollEntity)
    @JoinColumn({ name: 'payroll_id' })
    payroll;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'employee_id' })
    employee;
}
