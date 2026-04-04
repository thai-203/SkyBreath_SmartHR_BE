import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { AiChatConversationEntity } from './ai-chat-conversation.entity.js';

@Entity('ai_chat_messages')
export class AiChatMessageEntity {
    @PrimaryGeneratedColumn()
    id;

    @Column({ name: 'conversation_id', type: 'int' })
    conversationId;

    @Column({ type: 'varchar', length: 20 })
    role; // user, assistant, system

    @Column({ type: 'text', collation: 'utf8mb4_unicode_ci' })
    content;

    @Column({ name: 'function_call_name', type: 'varchar', length: 100, nullable: true })
    functionCallName;

    @Column({ name: 'function_args', type: 'json', nullable: true })
    functionArgs;

    @Column({ name: 'function_response', type: 'json', nullable: true })
    functionResponse;

    @Column({ name: 'ai_raw_response', type: 'json', nullable: true })
    aiRawResponse;

    @CreateDateColumn({ name: 'created_at' })
    createdAt;

    // Relations
    @ManyToOne(() => AiChatConversationEntity, (conv) => conv.messages, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'conversation_id' })
    conversation;
}
