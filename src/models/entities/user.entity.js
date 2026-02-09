import {
    Entity,
    Column,
    OneToMany,
    BeforeInsert,
    BeforeUpdate,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { UserRoleEntity } from './user-role.entity.js';

@Entity('users')
export class UserEntity extends BaseEntity {
    @Column({ unique: true, type: 'varchar' })
    username;

    @Column({ select: false, type: 'varchar' })
    @Exclude()
    password;

    @Column({ unique: true, type: 'varchar' })
    email;

    @Column({ default: 'ACTIVE', type: 'varchar' })
    status;

    @Column({ name: 'last_login_time', nullable: true, type: 'datetime' })
    lastLoginTime;

    @Column({ name: 'refresh_token', nullable: true, type: 'varchar' })
    @Exclude()
    refreshToken;

    @Column({ name: 'refresh_token_expire_at', nullable: true, type: 'datetime' })
    refreshTokenExpireAt;

    @OneToMany(() => UserRoleEntity, (userRole) => userRole.user)
    userRoles;

    @BeforeInsert()
    @BeforeUpdate()
    emailToLowerCase() {
        this.email = this.email?.toLowerCase();
    }
}
