import { Entity, Column, ManyToOne, JoinColumn, PrimaryColumn } from 'typeorm';
import { RoleEntity } from './role.entity.js';
import { PermissionEntity } from './permission.entity.js';

@Entity('role_permissions')
export class RolePermissionEntity {
    @PrimaryColumn({ name: 'role_id', type: 'int' })
    roleId;

    @PrimaryColumn({ name: 'permission_id', type: 'int' })
    permissionId;

    @ManyToOne(() => RoleEntity)
    @JoinColumn({ name: 'role_id' })
    role;

    @ManyToOne(() => PermissionEntity)
    @JoinColumn({ name: 'permission_id' })
    permission;

    @Column({ name: 'created_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    createdAt;

    @Column({ name: 'updated_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
    updatedAt;

    @Column({ name: 'deleted_at', type: 'datetime', nullable: true })
    deletedAt;

    @Column({ name: 'is_deleted', type: 'boolean', default: false })
    isDeleted;
}
