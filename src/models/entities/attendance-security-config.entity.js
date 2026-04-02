import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';

@Entity('attendance_security_configs')
export class AttendanceSecurityConfigEntity extends BaseEntity {
  // ===== IP SECURITY =====

  @Column({ name: 'require_ip_check', type: 'boolean', default: true })
  requireIpCheck;

  // ===== LOCATION SECURITY =====

  @Column({ name: 'require_location_check', type: 'boolean', default: false })
  requireLocationCheck;

  @Column({
    name: 'office_latitude',
    type: 'decimal',
    precision: 10,
    scale: 6,
    nullable: true,
  })
  officeLatitude;

  @Column({
    name: 'office_longitude',
    type: 'decimal',
    precision: 10,
    scale: 6,
    nullable: true,
  })
  officeLongitude;

  // Bán kính cho phép (mét)
  @Column({ name: 'location_radius_meters', type: 'int', nullable: true })
  locationRadiusMeters;

  // ===== DEVICE SECURITY (mở rộng thêm) =====

  @Column({ name: 'block_vpn', type: 'boolean', default: false })
  blockVpn;
}
