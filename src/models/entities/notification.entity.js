import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';

@Entity('notifications')
export class NotificationEntity extends BaseEntity {
    @Column({ type: 'varchar' })
    title;

    @Column({ type: 'text' })
    message;

    @Column({ name: 'notification_type', nullable: true, type: 'varchar' })
    notificationType;
}
