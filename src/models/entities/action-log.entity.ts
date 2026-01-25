import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { UserEntity } from './user.entity';

@Entity('action_logs')
export class ActionLogEntity extends BaseEntity {
    @Column({ name: 'user_id', nullable: true })
    userId: number;

    @Column({ name: 'action_type' })
    actionType: string;

    @Column({ name: 'target_table', nullable: true })
    targetTable: string;

    @Column({ name: 'target_record_id', nullable: true })
    targetRecordId: number;

    @Column({ name: 'before_data', type: 'json', nullable: true })
    beforeData: any;

    @Column({ name: 'after_data', type: 'json', nullable: true })
    afterData: any;

    @Column({ name: 'changed_fields', type: 'json', nullable: true })
    changedFields: any;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ name: 'request_ip', nullable: true })
    requestIp: string;

    @Column({ name: 'user_agent', nullable: true })
    userAgent: string;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'user_id' })
    user: UserEntity;
}
