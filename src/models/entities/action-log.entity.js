import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { UserEntity } from './user.entity.js';

@Entity('action_logs')
export class ActionLogEntity extends BaseEntity {
    @Column({ name: 'user_id', nullable: true, type: 'int' })
    userId;

    @Column({ name: 'action_type', type: 'varchar' })
    actionType;

    @Column({ name: 'target_table', nullable: true, type: 'varchar' })
    targetTable;

    @Column({ name: 'target_record_id', nullable: true, type: 'int' })
    targetRecordId;

    @Column({ name: 'before_data', type: 'json', nullable: true })
    beforeData;

    @Column({ name: 'after_data', type: 'json', nullable: true })
    afterData;

    @Column({ name: 'changed_fields', type: 'json', nullable: true })
    changedFields;

    @Column({ type: 'text', nullable: true })
    description;

    @Column({ name: 'request_ip', nullable: true, type: 'varchar' })
    requestIp;

    @Column({ name: 'user_agent', nullable: true, type: 'varchar' })
    userAgent;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'user_id' })
    user;
}
