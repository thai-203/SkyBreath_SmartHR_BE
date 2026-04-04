import { AiService } from '../services/ai.service.js';
import { ResponseUtil } from '../common/utils/response.util.js';

export class AiController {
  constructor() {
    this.aiService = new AiService();
  }

  // POST /ai/chat
  chat = async (req, res, next) => {
    try {
      const { content, conversationId } = req.body;
      const user = req.user;

      if (!content || !content.trim()) {
        return ResponseUtil.sendResponse(res, 'Nội dung tin nhắn không được để trống.', null, 400);
      }

      const response = await this.aiService.handleChat(user.id, user.roles, content.trim(), conversationId || null);
      return ResponseUtil.sendResponse(res, 'Phản hồi từ Assistant thành công', response);
    } catch (error) {
      console.error('AI Chat Error:', error);
      next(error);
    }
  };

  // GET /ai/conversations
  getConversations = async (req, res, next) => {
    try {
      const user = req.user;
      const conversations = await this.aiService.getConversations(user.id);
      return ResponseUtil.sendResponse(res, 'Lấy danh sách cuộc hội thoại thành công', conversations);
    } catch (error) {
      next(error);
    }
  };

  // POST /ai/conversations
  createConversation = async (req, res, next) => {
    try {
      const user = req.user;
      const { title } = req.body;
      const conversation = await this.aiService.createConversation(user.id, title);
      return ResponseUtil.sendResponse(res, 'Tạo cuộc hội thoại mới thành công', conversation, 201);
    } catch (error) {
      next(error);
    }
  };

  // DELETE /ai/conversations/:id
  deleteConversation = async (req, res, next) => {
    try {
      const user = req.user;
      const { id } = req.params;
      await this.aiService.deleteConversation(Number(id), user.id);
      return ResponseUtil.sendResponse(res, 'Xóa cuộc hội thoại thành công', null);
    } catch (error) {
      next(error);
    }
  };

  // GET /ai/conversations/:id/messages
  getMessages = async (req, res, next) => {
    try {
      const user = req.user;
      const { id } = req.params;
      const messages = await this.aiService.getMessages(Number(id), user.id);
      return ResponseUtil.sendResponse(res, 'Lấy lịch sử tin nhắn thành công', messages);
    } catch (error) {
      next(error);
    }
  };
}
