import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { AttendanceSecurityConfigEntity } from './attendance-security-config.entity.js';

@Entity('attendance_allowed_ips')
export class AttendanceAllowedIpEntity extends BaseEntity {
  @Column({ name: 'ip_range', type: 'varchar', length: 50 })
  ipRange; // vd: 192.168.1.0/24

  @Column({ name: 'description', type: 'varchar', nullable: true })
  description;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive;

  @ManyToOne(() => AttendanceSecurityConfigEntity, (config) => config.allowedIps, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'attendance_security_config_id' })
  config;
}
