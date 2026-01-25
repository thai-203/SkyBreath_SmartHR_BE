import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { RoleEntity } from './role.entity';
import { PermissionEntity } from './permission.entity';

@Entity('role_permissions')
export class RolePermissionEntity {
    @PrimaryColumn({ name: 'role_id' })
    roleId: number;

    @PrimaryColumn({ name: 'permission_id' })
    permissionId: number;

    @ManyToOne(() => RoleEntity)
    @JoinColumn({ name: 'role_id' })
    role: RoleEntity;

    @ManyToOne(() => PermissionEntity)
    @JoinColumn({ name: 'permission_id' })
    permission: PermissionEntity;

    @Column({ name: 'created_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    createdAt: Date;

    @Column({ name: 'updated_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt: Date;

    @Column({ name: 'deleted_at', type: 'datetime', nullable: true })
    deletedAt: Date;

    @Column({ name: 'is_deleted', default: false })
    isDeleted: boolean;
}
