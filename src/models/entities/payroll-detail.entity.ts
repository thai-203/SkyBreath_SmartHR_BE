import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { PayrollEntity } from './payroll.entity';
import { EmployeeEntity } from './employee.entity';

@Entity('payroll_details')
export class PayrollDetailEntity extends BaseEntity {
    @Column({ name: 'payroll_id' })
    payrollId: number;

    @Column({ name: 'employee_id' })
    employeeId: number;

    @Column({ name: 'base_salary', type: 'decimal', precision: 15, scale: 2 })
    baseSalary: number;

    @Column({ name: 'overtime_pay', type: 'decimal', precision: 15, scale: 2, default: 0 })
    overtimePay: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    bonus: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    penalty: number;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    deduction: number;

    @Column({ name: 'net_salary', type: 'decimal', precision: 15, scale: 2 })
    netSalary: number;

    @Column({ name: 'insurance_deduction', type: 'decimal', precision: 15, scale: 2, default: 0 })
    insuranceDeduction: number;

    @Column({ name: 'tax_deduction', type: 'decimal', precision: 15, scale: 2, default: 0 })
    taxDeduction: number;

    @ManyToOne(() => PayrollEntity)
    @JoinColumn({ name: 'payroll_id' })
    payroll: PayrollEntity;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'employee_id' })
    employee: EmployeeEntity;
}
