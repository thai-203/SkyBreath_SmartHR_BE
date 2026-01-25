import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { UserEntity } from './user.entity';
import { RoleEntity } from './role.entity';

@Entity('user_roles')
export class UserRoleEntity {
    @PrimaryColumn({ name: 'user_id' })
    userId: number;

    @PrimaryColumn({ name: 'role_id' })
    roleId: number;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'user_id' })
    user: UserEntity;

    @ManyToOne(() => RoleEntity)
    @JoinColumn({ name: 'role_id' })
    role: RoleEntity;

    @Column({ name: 'assigned_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    assignedAt: Date;

    @Column({ name: 'created_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @Column({ name: 'updated_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt: Date;

    @Column({ name: 'deleted_at', type: 'datetime', nullable: true })
    deletedAt: Date;

    @Column({ name: 'is_deleted', default: false })
    isDeleted: boolean;
}
