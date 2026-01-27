import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { UserRoleEntity } from './user-role.entity';
import { RolePermissionEntity } from './role-permission.entity';

@Entity('roles')
export class RoleEntity extends BaseEntity {
    @Column({ name: 'role_name', unique: true })
    roleName: string;

    @Column({ nullable: true })
    description: string;

    @OneToMany(() => UserRoleEntity, (userRole) => userRole.role)
    userRoles: UserRoleEntity[];

    @OneToMany(() => RolePermissionEntity, (rolePermission) => rolePermission.role)
    rolePermissions: RolePermissionEntity[];
}
