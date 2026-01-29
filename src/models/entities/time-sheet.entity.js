import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { EmployeeEntity } from './employee.entity.js';

@Entity('time_sheets')
export class TimeSheetEntity extends BaseEntity {
    @Column({ name: 'employee_id', type: 'int' })
    employeeId;

    @Column({ type: 'int' })
    month;

    @Column({ type: 'int' })
    year;

    @Column({ name: 'total_working_days', nullable: true, type: 'decimal', precision: 5, scale: 2 })
    totalWorkingDays;

    @Column({ name: 'total_working_hours', type: 'decimal', precision: 10, scale: 2, nullable: true })
    totalWorkingHours;

    @Column({ name: 'overtime_hours', type: 'decimal', precision: 10, scale: 2, nullable: true })
    overtimeHours;

    @Column({ name: 'is_locked', default: false, type: 'boolean' })
    isLocked;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'employee_id' })
    employee;
}
