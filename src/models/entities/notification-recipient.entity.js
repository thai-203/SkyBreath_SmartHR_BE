import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { NotificationEntity } from './notification.entity.js';
import { UserEntity } from './user.entity.js';
import { NotificationDeliveryStatus } from '../../common/enums/notification.enum.js';

@Entity('notification_recipients')
export class NotificationRecipientEntity extends BaseEntity {
    @Column({ name: 'notification_id', type: 'int' })
    notificationId;

    @Column({ name: 'user_id', type: 'int' })
    userId;

    @Column({ name: 'is_read', default: false, type: 'boolean' })
    isRead;

    @Column({ name: 'read_at', type: 'datetime', nullable: true })
    readAt;

    @Column({
        name: 'delivery_status',
        type: 'varchar',
        default: NotificationDeliveryStatus.PENDING,
    })
    deliveryStatus;

    @ManyToOne(() => NotificationEntity)
    @JoinColumn({ name: 'notification_id' })
    notification;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'user_id' })
    user;
}
