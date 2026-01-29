import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { EmployeeEntity } from './employee.entity.js';
import { JobGradeEntity } from './job-grade.entity.js';

@Entity('employee_salaries')
export class EmployeeSalaryEntity extends BaseEntity {
    @Column({ name: 'employee_id', type: 'int' })
    employeeId;

    @Column({ name: 'job_grade_id', nullable: true, type: 'int' })
    jobGradeId;

    @Column({ name: 'base_salary', type: 'decimal', precision: 15, scale: 2 })
    baseSalary;

    @Column({ name: 'performance_salary', type: 'decimal', precision: 15, scale: 2, default: 0 })
    performanceSalary;

    @Column({ name: 'lunch_allowance', type: 'decimal', precision: 15, scale: 2, default: 0 })
    lunchAllowance;

    @Column({ name: 'fuel_allowance', type: 'decimal', precision: 15, scale: 2, default: 0 })
    fuelAllowance;

    @Column({ name: 'phone_allowance', type: 'decimal', precision: 15, scale: 2, default: 0 })
    phoneAllowance;

    @Column({ name: 'other_allowance', type: 'decimal', precision: 15, scale: 2, default: 0 })
    otherAllowance;

    @Column({ name: 'salary_type', default: 1, type: 'int' }) // 0: Probation, 1: Official
    salaryType;

    @Column({ name: 'effective_from', type: 'date', nullable: true })
    effectiveFrom;

    @Column({ name: 'effective_to', type: 'date', nullable: true })
    effectiveTo;

    @Column({ name: 'salary_status', default: 'ACTIVE', type: 'varchar' })
    salaryStatus;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'employee_id' })
    employee;

    @ManyToOne(() => JobGradeEntity)
    @JoinColumn({ name: 'job_grade_id' })
    jobGrade;
}
