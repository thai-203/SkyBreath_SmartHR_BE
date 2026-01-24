import {
    Entity,
    Column,
    ManyToMany,
    JoinTable,
    OneToOne,
    BeforeInsert,
    BeforeUpdate,
} from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from '../../../common/entities';
import { RoleEntity } from './role.entity';

@Entity('users')
export class UserEntity extends BaseEntity {
    @Column({ unique: true })
    email: string;

    @Column()
    @Exclude()
    password: string;

    @Column({ name: 'first_name', nullable: true })
    firstName: string;

    @Column({ name: 'last_name', nullable: true })
    lastName: string;

    @Column({ name: 'is_active', default: true })
    isActive: boolean;

    @Column({ name: 'is_email_verified', default: false })
    isEmailVerified: boolean;

    @Column({ name: 'last_login_at', nullable: true })
    lastLoginAt: Date;

    @Column({ name: 'refresh_token', nullable: true })
    @Exclude()
    refreshToken: string;

    @ManyToMany(() => RoleEntity, (role) => role.users, { eager: true })
    @JoinTable({
        name: 'user_roles',
        joinColumn: { name: 'user_id', referencedColumnName: 'id' },
        inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
    })
    roles: RoleEntity[];

    // Virtual property
    get fullName(): string {
        return `${this.firstName || ''} ${this.lastName || ''}`.trim();
    }

    get roleNames(): string[] {
        return this.roles?.map((role) => role.name) || [];
    }

    @BeforeInsert()
    @BeforeUpdate()
    emailToLowerCase() {
        this.email = this.email?.toLowerCase();
    }
}
