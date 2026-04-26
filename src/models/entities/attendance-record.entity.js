import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { EmployeeEntity } from './employee.entity.js';
import { ShiftScheduleEntity } from './shift-schedule.entity.js';

export const AttendanceStatus = {
  PRESENT: 'present',
  LATE: 'late',
  EARLY_LEAVE: 'early_leave',
  ABSENT: 'absent',
  HALF_DAY: 'half_day',
};

export const AttendanceType = {
  FACE: 'face',
  GPS: 'gps',
  QR: 'qr',
  MANUAL: 'manual',
};

@Entity('attendance_records')
@Index(['employeeId', 'workDate'], { unique: true }) // 1 ngày chỉ 1 record
export class AttendanceRecordEntity extends BaseEntity {
  @Column({ name: 'employee_id', type: 'int' })
  employeeId;

  @Column({ name: 'work_date', type: 'date', nullable: true })
  workDate;

  @Column({ name: 'shift_schedule_id', type: 'int', nullable: true })
  shiftScheduleId;

  @Column({ name: 'check_in_time', type: 'datetime', nullable: true })
  checkInTime;

  @Column({ name: 'check_out_time', type: 'datetime', nullable: true })
  checkOutTime;

  @Column({
    name: 'attendance_status',
    type: 'enum',
    enum: Object.values(AttendanceStatus),
    nullable: true,
  })
  attendanceStatus;

  @Column({
    name: 'attendance_type',
    type: 'enum',
    enum: Object.values(AttendanceType),
    default: AttendanceType.FACE,
  })
  attendanceType;

  @Column({ name: 'late_minutes', type: 'int', nullable: true })
  lateMinutes;

  @Column({ name: 'early_leave_minutes', type: 'int', nullable: true })
  earlyLeaveMinutes;

  @Column({ name: 'overtime_minutes', type: 'int', nullable: true })
  overtimeMinutes;

  @Column({ name: 'total_work_minutes', type: 'int', nullable: true })
  totalWorkMinutes;

  @ManyToOne(() => EmployeeEntity)
  @JoinColumn({ name: 'employee_id' })
  employee;

  @ManyToOne(() => ShiftScheduleEntity)
  @JoinColumn({ name: 'shift_schedule_id', nullable: true })
  shiftSchedule;
}
