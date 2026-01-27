import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { EmployeeEntity } from './employee.entity';
import { JobGradeEntity } from './job-grade.entity';

@Entity('employee_salaries')
export class EmployeeSalaryEntity extends BaseEntity {
    @Column({ name: 'employee_id' })
    employeeId: number;

    @Column({ name: 'job_grade_id', nullable: true })
    jobGradeId: number;

    @Column({ name: 'base_salary', type: 'decimal', precision: 15, scale: 2 })
    baseSalary: number;

    @Column({ name: 'performance_salary', type: 'decimal', precision: 15, scale: 2, default: 0 })
    performanceSalary: number;

    @Column({ name: 'lunch_allowance', type: 'decimal', precision: 15, scale: 2, default: 0 })
    lunchAllowance: number;

    @Column({ name: 'fuel_allowance', type: 'decimal', precision: 15, scale: 2, default: 0 })
    fuelAllowance: number;

    @Column({ name: 'phone_allowance', type: 'decimal', precision: 15, scale: 2, default: 0 })
    phoneAllowance: number;

    @Column({ name: 'other_allowance', type: 'decimal', precision: 15, scale: 2, default: 0 })
    otherAllowance: number;

    @Column({ name: 'salary_type', default: 1 }) // 0: Probation, 1: Official
    salaryType: number;

    @Column({ name: 'effective_from', type: 'date', nullable: true })
    effectiveFrom: Date;

    @Column({ name: 'effective_to', type: 'date', nullable: true })
    effectiveTo: Date;

    @Column({ name: 'salary_status', default: 'ACTIVE' })
    salaryStatus: string;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'employee_id' })
    employee: EmployeeEntity;

    @ManyToOne(() => JobGradeEntity)
    @JoinColumn({ name: 'job_grade_id' })
    jobGrade: JobGradeEntity;
}
