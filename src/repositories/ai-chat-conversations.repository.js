import { AppDataSource } from '../database/data-source.js';
import { AiChatConversationEntity } from '../models/entities/ai-chat-conversation.entity.js';

export const AiChatConversationRepository = AppDataSource.getRepository(AiChatConversationEntity).extend({
    async findByUserId(userId) {
        return this.find({
            where: { userId, isDeleted: false },
            order: { updatedAt: 'DESC' },
            select: ['id', 'userId', 'title', 'isActive', 'createdAt', 'updatedAt'],
        });
    },

    async findByIdAndUserId(id, userId) {
        return this.findOne({
            where: { id, userId, isDeleted: false },
        });
    },

    async softDelete(id) {
        return this.update(id, { isDeleted: true, isActive: 0 });
    },
});
