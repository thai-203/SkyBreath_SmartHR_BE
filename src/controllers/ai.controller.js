import { AiService } from '../services/ai.service.js';
import { ResponseUtil } from '../common/utils/response.util.js';

export class AiController {
  constructor() {
    this.aiService = new AiService();
  }

  chat = async (req, res, next) => {
    try {
      const { messages } = req.body;
      const user = req.user; // from requireAuth middleware

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        return ResponseUtil.sendResponse(res, 'Messages array is required and cannot be empty.', null, 400); // Or use BadRequestException
      }

      const response = await this.aiService.handleChat(user.id, user.roles, messages);
      
      return ResponseUtil.sendResponse(res, 'Phản hồi từ Assistant thành công', response);
    } catch (error) {
      console.error('AI Chat Error:', error);
      next(error);
    }
  };
}
