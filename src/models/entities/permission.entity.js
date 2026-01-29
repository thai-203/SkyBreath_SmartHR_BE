import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';

@Entity('permissions')
export class PermissionEntity extends BaseEntity {
    @Column({ name: 'permission_code', type: 'varchar' })
    permissionCode;

    @Column({ nullable: true, type: 'varchar' })
    description;
}
