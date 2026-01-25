import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('notifications')
export class NotificationEntity extends BaseEntity {
    @Column()
    title: string;

    @Column({ type: 'text' })
    message: string;

    @Column({ name: 'notification_type', nullable: true })
    notificationType: string;
}
