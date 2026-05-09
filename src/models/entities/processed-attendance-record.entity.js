import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { EmployeeEntity } from './employee.entity.js';
import { WorkingShiftEntity } from './working-shift.entity.js';
import { RequestEntity } from './request.entity.js';
import { ShiftAssignmentEntity } from './shift-assignment.entity.js';

@Entity('processed_attendance_records')
export class ProcessedAttendanceRecordEntity extends BaseEntity {
    @Column({ name: 'employee_id', type: 'int' })
    employeeId;

    @Column({ name: 'attendance_date', type: 'date' })
    attendanceDate;

    @Column({ name: 'working_shift_id', type: 'int', nullable: true })
    workingShiftId;

    @Column({ name: 'assignment_id', type: 'int', nullable: true })
    assignmentId;

    @Column({ name: 'check_in_time', type: 'datetime', nullable: true })
    checkInTime;

    @Column({ name: 'check_out_time', type: 'datetime', nullable: true })
    checkOutTime;

    @Column({ name: 'shift_start_time', type: 'time', nullable: true })
    shiftStartTime;

    @Column({ name: 'shift_end_time', type: 'time', nullable: true })
    shiftEndTime;

    @Column({ name: 'late_minutes', type: 'int', default: 0 })
    lateMinutes;

    @Column({ name: 'early_minutes', type: 'int', default: 0 })
    earlyMinutes;

    @Column({ name: 'attendance_status', type: 'varchar', length: 20, default: 'PRESENT' })
    attendanceStatus;

    @Column({ name: 'work_value', type: 'decimal', precision: 3, scale: 2, default: 1.00 })
    workValue;

    @Column({ name: 'source_type', type: 'tinyint', default: 1 })
    sourceType;

    @Column({ name: 'raw_record_id', type: 'int', nullable: true })
    rawRecordId;

    @Column({ name: 'updated_by', type: 'int', nullable: true })
    updatedBy;

    @Column({ name: 'request_id', type: 'int', nullable: true })
    requestId;

    @Column({ name: 'is_finalized', type: 'boolean', default: false })
    isFinalized;

    // Relations
    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'employee_id' })
    employee;

    @ManyToOne(() => WorkingShiftEntity)
    @JoinColumn({ name: 'working_shift_id' })
    workingShift;

    @ManyToOne(() => RequestEntity)
    @JoinColumn({ name: 'request_id' })
    request;

    @ManyToOne(() => ShiftAssignmentEntity)
    @JoinColumn({ name: 'assignment_id' })
    assignment;
}
