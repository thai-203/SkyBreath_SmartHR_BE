import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { NotificationSourceType, NotificationSendStatus } from '../../common/enums/notification.enum.js';

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

    // ─── Manual / Source tracking ─────────────────────────────────────────
    @Column({
        name: 'source_type',
        type: 'varchar',
        default: NotificationSourceType.WORKFLOW,
    })
    sourceType;

    @Column({ name: 'sent_by', type: 'int', nullable: true })
    sentBy; // userId của người gửi thủ công (null nếu auto)

    @Column({
        name: 'send_status',
        type: 'varchar',
        default: NotificationSendStatus.SENT,
    })
    sendStatus;

    @Column({ name: 'scheduled_at', type: 'datetime', nullable: true })
    scheduledAt; // thời điểm hẹn giờ gửi

    @Column({ name: 'sent_at', type: 'datetime', nullable: true })
    sentAt; // thời điểm thực sự đã gửi

    @Column({ name: 'recipient_scope', type: 'varchar', nullable: true })
    recipientScope; // 'ALL' | 'DEPARTMENT' | 'USERS'

    @Column({ name: 'recipient_scope_ids', type: 'text', nullable: true })
    recipientScopeIds; // JSON array of IDs (dept IDs or user IDs)
}
