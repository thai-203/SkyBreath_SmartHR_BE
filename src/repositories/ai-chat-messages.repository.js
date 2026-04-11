import { AppDataSource } from '../database/data-source.js';
import { AiChatMessageEntity } from '../models/entities/ai-chat-message.entity.js';

export const AiChatMessageRepository = AppDataSource.getRepository(AiChatMessageEntity).extend({
    async findByConversationId(conversationId) {
        return this.find({
            where: { conversationId },
            order: { createdAt: 'ASC' },
        });
    },

    async saveMessage(data) {
        const msg = this.create(data);
        return this.save(msg);
    },

    async deleteByConversationId(conversationId) {
        return this.delete({ conversationId });
    },
});
