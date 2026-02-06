import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';

@Entity('permissions')
export class PermissionEntity extends BaseEntity {
    @Column({ name: 'permission_code', type: 'varchar' })
    permissionCode;

    @Column({ nullable: true, type: 'varchar' })
    description;

    @Column({ nullable: true, type: 'varchar', default: 'General' })
    module;
}
