import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';

@Entity('attendance_blocking_configs')
export class AttendanceBlockingConfigEntity extends BaseEntity {
  @Column({ name: 'rule_name', type: 'varchar' })
  ruleName; // VD: "Cấu hình chặn khuôn mặt"

  @Column({ name: 'error_type', type: 'varchar', unique: true })
  errorType; // FACE, LOCATION, NETWORK

  @Column({ name: 'max_retry_limit', type: 'int', default: 5 })
  maxRetryLimit;

  @Column({ name: 'block_duration_minutes', type: 'int', default: 15 })
  blockDurationMinutes;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive;
  
}