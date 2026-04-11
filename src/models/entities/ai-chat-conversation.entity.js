import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { UserEntity } from './user.entity.js';

@Entity('ai_chat_conversations')
export class AiChatConversationEntity extends BaseEntity {
    @Column({ name: 'user_id', type: 'int' })
    userId;

    @Column({ type: 'varchar', length: 255, default: 'Cuộc hội thoại mới', collation: 'utf8mb4_unicode_ci' })
    title;

    @Column({ name: 'is_active', type: 'tinyint', default: 1 })
    isActive;

    // Relations
    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'user_id' })
    user;

    @OneToMany('AiChatMessageEntity', (msg) => msg.conversation)
    messages;
}
