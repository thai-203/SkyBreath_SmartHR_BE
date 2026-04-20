import { Entity, Column, OneToMany, BeforeInsert, BeforeUpdate } from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { UserRoleEntity } from './user-role.entity.js';

@Entity('users')
export class UserEntity extends BaseEntity {
  @Column({ type: 'varchar' })
  username;

  @Column({ select: false, type: 'varchar' })
  @Exclude()
  password;

  @Column({ type: 'varchar' })
  email;

  @Column({ default: 'ACTIVE', type: 'varchar' })
  status; // ACTIVE, LOCKED, DELETED

  @Column({ name: 'last_login_time', nullable: true, type: 'datetime' })
  lastLoginTime;

  @Column({ name: 'refresh_token', nullable: true, type: 'varchar' })
  @Exclude()
  refreshToken;

  @Column({ name: 'refresh_token_expire_at', nullable: true, type: 'datetime' })
  refreshTokenExpireAt;

  @Column({ name: 'must_change_password', default: false, type: 'boolean' })
  mustChangePassword;

  @Column({ name: 'otp', nullable: true, type: 'varchar' })
  @Exclude()
  otp;

  @Column({ name: 'otp_expires_at', nullable: true, type: 'datetime' })
  otpExpiresAt;

  @Column({ name: 'otp_request_id', nullable: true, type: 'varchar' })
  otpRequestId;

  @OneToMany(() => UserRoleEntity, (userRole) => userRole.user)
  userRoles;

  @BeforeInsert()
  @BeforeUpdate()
  emailToLowerCase() {
    this.email = this.email?.toLowerCase();
  }
}
