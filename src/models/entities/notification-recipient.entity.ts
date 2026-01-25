import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { NotificationEntity } from './notification.entity';
import { UserEntity } from './user.entity';

@Entity('notification_recipients')
export class NotificationRecipientEntity extends BaseEntity {
    @Column({ name: 'notification_id' })
    notificationId: number;

    @Column({ name: 'user_id' })
    userId: number;

    @Column({ name: 'is_read', default: false })
    isRead: boolean;

    @Column({ name: 'read_at', type: 'datetime', nullable: true })
    readAt: Date;

    @ManyToOne(() => NotificationEntity)
    @JoinColumn({ name: 'notification_id' })
    notification: NotificationEntity;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'user_id' })
    user: UserEntity;
}
