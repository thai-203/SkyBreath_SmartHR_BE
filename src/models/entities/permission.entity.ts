import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('permissions')
export class PermissionEntity extends BaseEntity {
    @Column({ name: 'permission_code' })
    permissionCode: string;

    @Column({ nullable: true })
    description: string;
}
