import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';

@Entity('notifications')
export class NotificationEntity extends BaseEntity {
    @Column({ type: 'varchar' })
    title;

    @Column({ type: 'text' })
    message;

    @Column({ name: 'notification_type', nullable: true, type: 'varchar' })
    notificationType;

    @Column({ name: 'link', type: 'varchar', length: 500, nullable: true })
    link;

    @Column({ name: 'related_request_id', type: 'int', nullable: true })
    relatedRequestId;
}
