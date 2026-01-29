import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { EmployeeEntity } from './employee.entity.js';

@Entity('attendance_records')
export class AttendanceRecordEntity extends BaseEntity {
    @Column({ name: 'employee_id', type: 'int' })
    employeeId;

    @Column({ name: 'check_in_time', type: 'datetime', nullable: true })
    checkInTime;

    @Column({ name: 'check_out_time', type: 'datetime', nullable: true })
    checkOutTime;

    @Column({ name: 'attendance_status', nullable: true, type: 'varchar' })
    attendanceStatus;

    @Column({ name: 'attendance_type', nullable: true, type: 'varchar' })
    attendanceType;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'employee_id' })
    employee;
}
