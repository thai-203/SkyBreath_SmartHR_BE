import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { EmployeeEntity } from './employee.entity';

@Entity('time_sheets')
export class TimeSheetEntity extends BaseEntity {
    @Column({ name: 'employee_id' })
    employeeId: number;

    @Column()
    month: number;

    @Column()
    year: number;

    @Column({ name: 'total_working_days', nullable: true })
    totalWorkingDays: number;

    @Column({ name: 'total_working_hours', type: 'decimal', precision: 10, scale: 2, nullable: true })
    totalWorkingHours: number;

    @Column({ name: 'overtime_hours', type: 'decimal', precision: 10, scale: 2, nullable: true })
    overtimeHours: number;

    @Column({ name: 'is_locked', default: false })
    isLocked: boolean;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'employee_id' })
    employee: EmployeeEntity;
}
