import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { RolePermissionEntity } from './role-permission.entity.js';
import { UserRoleEntity } from './user-role.entity.js';

@Entity('roles')
export class RoleEntity extends BaseEntity {
    @Column({ name: 'role_name', unique: true, type: 'varchar' })
    roleName;

    @Column({ type: 'varchar', default: 'active' })
    status;

    @Column({ name: 'is_system', type: 'boolean', default: false })
    isSystem;

    @Column({ nullable: true, type: 'varchar' })
    description;

    @OneToMany(() => UserRoleEntity, (userRole) => userRole.role)
    userRoles;

    @OneToMany(() => RolePermissionEntity, (rolePermission) => rolePermission.role)
    rolePermissions;
}
