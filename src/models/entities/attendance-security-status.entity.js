import { Entity, Column, Index, OneToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { EmployeeEntity } from './employee.entity.js';

@Entity('attendance_security_status')
export class AttendanceSecurityStatusEntity extends BaseEntity {
  @Index({ unique: true })
  @Column({ name: 'employee_id', type: 'int' })
  employeeId;

  /**
   * Lưu trữ JSON trong MySQL: { "FACE": 2, "LOCATION": 1 }
   */
  @Column({ name: 'failure_counts', type: 'json', nullable: true })
  failureCounts;

  @Column({ name: 'blocked_until', type: 'timestamp', nullable: true })
  blockedUntil;

  @Column({ name: 'last_failure_at', type: 'timestamp', nullable: true })
  lastFailureAt;

  @OneToOne(() => EmployeeEntity)
  @JoinColumn({ name: 'employee_id' })
  employee;
}
