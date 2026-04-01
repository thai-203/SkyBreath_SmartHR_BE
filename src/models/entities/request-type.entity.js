import { Entity, Column, ManyToOne, JoinColumn, OneToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { RequestGroupEntity } from './request-group.entity.js';
import { RequestTypePolicyEntity } from './request-type-policy.entity.js';

@Entity('request_types')
export class RequestTypeEntity extends BaseEntity {
    @Column({ name: 'request_group_id', type: 'int' })
    requestGroupId;

    @Column({ name: 'name', type: 'varchar', length: 255 })
    name; // Tên loại đơn (VD: Thêm giờ ngày lễ, OT cuối tuần)

    @Column({ name: 'description', type: 'text', nullable: true })
    description;

    @Column({ name: 'status', type: 'varchar', length: 50, default: 'ACTIVE' })
    status; // ACTIVE, INACTIVE

    @ManyToOne(() => RequestGroupEntity, (group) => group.requestTypes)
    @JoinColumn({ name: 'request_group_id' })
    requestGroup;

    @OneToOne(() => RequestTypePolicyEntity, (policy) => policy.requestType)
    policy; // Cấu hình Policy liên kết 1-1
}
