import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { RequestTypeEntity } from './request-type.entity.js';
import { RequestGroupWorkflowEntity } from './request-group-workflow.entity.js';

@Entity('request_groups')
export class RequestGroupEntity extends BaseEntity {
    @Column({ name: 'name', type: 'varchar', length: 255 })
    name;

    @Column({ name: 'description', type: 'text', nullable: true })
    description;

    @Column({ name: 'code', type: 'varchar', length: 100, unique: true })
    code; // Mã nhóm đơn từ

    @Column({ name: 'status', type: 'varchar', length: 50, default: 'ACTIVE' })
    status; // ACTIVE, INACTIVE

    @OneToMany(() => RequestTypeEntity, (requestType) => requestType.requestGroup)
    requestTypes;

    @OneToMany(() => RequestGroupWorkflowEntity, (workflow) => workflow.requestGroup)
    workflows;
}
