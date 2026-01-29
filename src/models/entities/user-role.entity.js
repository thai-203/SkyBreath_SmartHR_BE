import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { UserEntity } from './user.entity.js';
import { RoleEntity } from './role.entity.js';

@Entity('user_roles')
export class UserRoleEntity {
    @PrimaryColumn({ name: 'user_id', type: 'int' })
    userId;

    @PrimaryColumn({ name: 'role_id', type: 'int' })
    roleId;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'user_id' })
    user;

    @ManyToOne(() => RoleEntity)
    @JoinColumn({ name: 'role_id' })
    role;

    @Column({ name: 'assigned_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    assignedAt;

    @Column({ name: 'created_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    createdAt;

    @Column({ name: 'updated_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt;

    @Column({ name: 'deleted_at', type: 'datetime', nullable: true })
    deletedAt;

    @Column({ name: 'is_deleted', type: 'boolean', default: false })
    isDeleted;
}
