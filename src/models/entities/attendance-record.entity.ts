import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { EmployeeEntity } from './employee.entity';

@Entity('attendance_records')
export class AttendanceRecordEntity extends BaseEntity {
    @Column({ name: 'employee_id' })
    employeeId: number;

    @Column({ name: 'check_in_time', type: 'datetime', nullable: true })
    checkInTime: Date;

    @Column({ name: 'check_out_time', type: 'datetime', nullable: true })
    checkOutTime: Date;

    @Column({ name: 'attendance_status', nullable: true })
    attendanceStatus: string;

    @Column({ name: 'attendance_type', nullable: true })
    attendanceType: number;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'employee_id' })
    employee: EmployeeEntity;
}
