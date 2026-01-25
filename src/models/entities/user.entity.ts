import {
    Entity,
    Column,
    OneToMany,
    BeforeInsert,
    BeforeUpdate,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from '../../common/entities/base.entity';
import { UserRoleEntity } from './user-role.entity';

@Entity('users')
export class UserEntity extends BaseEntity {
    @Column({ unique: true })
    username: string;

    @Column({ select: false })
    @Exclude()
    password: string;

    @Column({ unique: true })
    email: string;

    @Column({ default: 'ACTIVE' })
    status: string;

    @Column({ name: 'last_login_time', nullable: true })
    lastLoginTime: Date;

    @Column({ name: 'refresh_token', nullable: true, select: false })
    @Exclude()
    refreshToken: string;

    @Column({ name: 'refresh_token_expire_at', nullable: true })
    refreshTokenExpireAt: Date;

    @OneToMany(() => UserRoleEntity, (userRole) => userRole.user)
    userRoles: UserRoleEntity[];

    @BeforeInsert()
    @BeforeUpdate()
    emailToLowerCase() {
        this.email = this.email?.toLowerCase();
    }
}
