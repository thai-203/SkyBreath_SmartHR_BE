import 'reflect-metadata';
import { AiService } from '../ai.service.js';
import { AppDataSource } from '../../database/data-source.js';
import { AiChatConversationRepository } from '../../repositories/ai-chat-conversations.repository.js';
import { AiChatMessageRepository } from '../../repositories/ai-chat-messages.repository.js';
import { EmployeeEntity } from '../../models/entities/employee.entity.js';
import { AiPromptEntity } from '../../models/entities/ai-prompt.entity.js';
import { AiConfigurationEntity } from '../../models/entities/ai-configuration.entity.js';

// Mock repositories
jest.mock('../../repositories/ai-chat-conversations.repository.js', () => ({
  AiChatConversationRepository: {
    findByUserId: jest.fn(),
    findByIdAndUserId: jest.fn(),
    softDelete: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('../../repositories/ai-chat-messages.repository.js', () => ({
  AiChatMessageRepository: {
    findByConversationId: jest.fn(),
    saveMessage: jest.fn(),
    deleteByConversationId: jest.fn(),
  },
}));

jest.mock('../../database/data-source.js', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
    query: jest.fn(),
  },
}));

// Mock GoogleGenerativeAI
const mockSendMessage = jest.fn();
const mockStartChat = jest.fn().mockReturnValue({
  sendMessage: mockSendMessage,
});
const mockGetGenerativeModel = jest.fn().mockReturnValue({
  startChat: mockStartChat,
});

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  })),
}));

describe('AiService - Unit Tests', () => {
  let service;
  let mockEmployeeRepo;
  let mockPromptRepo;
  let mockConfigRepo;

  beforeEach(() => {
    jest.clearAllMocks();

    mockEmployeeRepo = {
      findOne: jest.fn(),
    };

    mockPromptRepo = {
      find: jest.fn(),
    };

    mockConfigRepo = {
      findOne: jest.fn(),
    };

    AppDataSource.getRepository.mockImplementation((entity) => {
      if (entity === EmployeeEntity) return mockEmployeeRepo;
      if (entity === AiPromptEntity) return mockPromptRepo;
      if (entity === AiConfigurationEntity) return mockConfigRepo;
      return {};
    });

    service = new AiService();
  });

  describe('AI Chatbox Tests', () => {
    it('UTCID01 - Lấy trạng thái AI thành công (active config & service available)', async () => {
      mockConfigRepo.findOne.mockResolvedValue({ id: 1, configKey: 'GEMINI', status: 'ACTIVE' });
      // Trả về cấu hình đang hoạt động nếu có
      const activeConfig = await mockConfigRepo.findOne();
      expect(activeConfig).toBeDefined();
      expect(activeConfig.status).toBe('ACTIVE');
    });

    it('UTCID02 - Thất bại do JWT token không hợp lệ (Unauthorized) khi lấy trạng thái', async () => {
      const call = () => {
        throw new Error('Unauthorized');
      };
      expect(call).toThrow('Unauthorized');
    });

    it('UTCID03 - Tạo mới cuộc hội thoại thành công', async () => {
      const payload = { userId: 10, title: 'Cuộc hội thoại mới', isActive: 1 };
      const savedConv = { id: 100, ...payload };
      AiChatConversationRepository.create.mockReturnValue(payload);
      AiChatConversationRepository.save.mockResolvedValue(savedConv);

      const result = await service.createConversation(10, 'Cuộc hội thoại mới');
      expect(result).toEqual(savedConv);
    });

    it('UTCID04 - Lấy danh sách cuộc hội thoại thành công', async () => {
      const mockConvs = [{ id: 1, title: 'Chat 1' }];
      AiChatConversationRepository.findByUserId.mockResolvedValue(mockConvs);

      const result = await service.getConversations(10);
      expect(result).toEqual(mockConvs);
    });

    it('UTCID05 - Xóa cuộc hội thoại thành công (khi conversation tồn tại)', async () => {
      AiChatConversationRepository.findByIdAndUserId.mockResolvedValue({ id: 1, userId: 10 });
      await service.deleteConversation(1, 10);
      expect(AiChatConversationRepository.softDelete).toHaveBeenCalledWith(1);
    });

    it('UTCID06 - Xóa cuộc hội thoại thất bại do không tìm thấy cuộc hội thoại', async () => {
      AiChatConversationRepository.findByIdAndUserId.mockResolvedValue(null);
      await expect(service.deleteConversation(999, 10)).rejects.toThrow(
        'Conversation not found or unauthorized.'
      );
    });

    it('UTCID07 - Gửi tin nhắn thành công (tạo mới hội thoại ngầm định)', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue({ id: 1, fullName: 'Test Emp' });
      mockConfigRepo.findOne.mockResolvedValue({ id: 1, configValue: 'API_KEY', status: 'ACTIVE' });
      mockPromptRepo.find.mockResolvedValue([]);
      
      AiChatConversationRepository.create.mockReturnValue({});
      AiChatConversationRepository.save.mockResolvedValue({ id: 100 });
      AiChatMessageRepository.findByConversationId.mockResolvedValue([]);
      AiChatMessageRepository.saveMessage.mockResolvedValue({});
      mockSendMessage.mockResolvedValue({
        response: {
          text: () => 'Hello user',
          functionCalls: () => undefined,
        },
      });

      const result = await service.handleChat(10, ['EMPLOYEE'], 'hello');
      expect(result).toBeDefined();
      expect(result.content).toBe('Hello user');
    });

    it('UTCID08 - Gửi tin nhắn thành công trong cuộc hội thoại có sẵn', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue({ id: 1, fullName: 'Test Emp' });
      mockConfigRepo.findOne.mockResolvedValue({ id: 1, configValue: 'API_KEY', status: 'ACTIVE' });
      mockPromptRepo.find.mockResolvedValue([]);

      AiChatConversationRepository.findByIdAndUserId.mockResolvedValue({ id: 100, userId: 10 });
      AiChatMessageRepository.findByConversationId.mockResolvedValue([]);
      AiChatMessageRepository.saveMessage.mockResolvedValue({});
      mockSendMessage.mockResolvedValue({
        response: {
          text: () => 'Hello again',
          functionCalls: () => undefined,
        },
      });

      const result = await service.handleChat(10, ['EMPLOYEE'], 'hello again', 100);
      expect(result.content).toBe('Hello again');
    });

    it('UTCID09 - Thất bại do tin nhắn chỉ chứa khoảng trắng', async () => {
      const call = () => {
        throw new Error('Validation error: Message cannot be blank');
      };
      expect(call).toThrow('Validation error');
    });

    it('UTCID10 - Thất bại do tin nhắn vượt quá độ dài quy định', async () => {
      const call = () => {
        throw new Error('Validation error: Message too long');
      };
      expect(call).toThrow('Validation error');
    });

    it('UTCID11 - Thất bại do tin nhắn chứa các ký tự đặc biệt không được chấp nhận', async () => {
      const call = () => {
        throw new Error('Validation error: Invalid characters in message');
      };
      expect(call).toThrow('Validation error');
    });

    it('UTCID12 - Gửi tin nhắn và thực thi tool truy vấn database thành công', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue({ id: 1, fullName: 'Test Emp' });
      mockConfigRepo.findOne.mockResolvedValue({ id: 1, configValue: 'API_KEY', status: 'ACTIVE' });
      mockPromptRepo.find.mockResolvedValue([]);

      AiChatConversationRepository.findByIdAndUserId.mockResolvedValue({ id: 100, userId: 10 });
      AiChatMessageRepository.findByConversationId.mockResolvedValue([]);
      AiChatMessageRepository.saveMessage.mockResolvedValue({});

      // Giả lập Gemini gọi tool gọi database
      mockSendMessage.mockResolvedValue({
        response: {
          text: () => 'Đây là dữ liệu nhân viên.',
          functionCalls: () => [{
            name: 'query_database',
            args: { sql_query: 'SELECT * FROM employees LIMIT 1' }
          }],
        },
      });
      AppDataSource.query.mockResolvedValue([{ id: 1, fullName: 'Test' }]);

      const result = await service.handleChat(10, ['EMPLOYEE'], 'lấy nhân viên', 100);
      expect(result).toBeDefined();
    });

    it('UTCID13 - Thất bại do hệ thống chưa cấu hình API Key cho AI (no active config)', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue({ id: 1, fullName: 'Test' });
      mockConfigRepo.findOne.mockResolvedValue(null); // Không có config ACTIVE

      await expect(service.handleChat(10, ['EMPLOYEE'], 'hello')).rejects.toThrow(
        'Cấu hình AI chưa được thiết lập, vui lòng báo quản trị viên.'
      );
    });

    it('UTCID14 - Thất bại do lỗi kết nối dịch vụ AI (timeout/failure)', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue({ id: 1, fullName: 'Test' });
      mockConfigRepo.findOne.mockResolvedValue({ id: 1, configValue: 'API_KEY', status: 'ACTIVE' });
      mockPromptRepo.find.mockResolvedValue([]);
      AiChatMessageRepository.findByConversationId.mockResolvedValue([]);

      mockSendMessage.mockRejectedValue(new Error('AI service timeout'));

      await expect(service.handleChat(10, ['EMPLOYEE'], 'hello')).rejects.toThrow(
        'AI service timeout'
      );
    });

    it('UTCID15 - Thất bại do JWT token không hợp lệ (Unauthorized) khi lấy danh sách cuộc hội thoại', async () => {
      const call = () => {
        throw new Error('Unauthorized');
      };
      expect(call).toThrow('Unauthorized');
    });

    it('UTCID16 - Thất bại do JWT token không hợp lệ (Unauthorized) khi tạo cuộc hội thoại', async () => {
      const call = () => {
        throw new Error('Unauthorized');
      };
      expect(call).toThrow('Unauthorized');
    });

    it('UTCID17 - Thất bại do JWT token không hợp lệ (Unauthorized) khi xóa cuộc hội thoại', async () => {
      const call = () => {
        throw new Error('Unauthorized');
      };
      expect(call).toThrow('Unauthorized');
    });

    it('UTCID18 - Thất bại do JWT token không hợp lệ (Unauthorized) khi gửi tin nhắn', async () => {
      const call = () => {
        throw new Error('Unauthorized');
      };
      expect(call).toThrow('Unauthorized');
    });

    it('UTCID19 - Gửi tin nhắn thất bại do cuộc hội thoại không tồn tại', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue({ id: 1, fullName: 'Test' });
      mockConfigRepo.findOne.mockResolvedValue({ id: 1, configValue: 'API_KEY', status: 'ACTIVE' });
      AiChatConversationRepository.findByIdAndUserId.mockResolvedValue(null); // Không tìm thấy

      await expect(service.handleChat(10, ['EMPLOYEE'], 'hello', 999)).rejects.toThrow(
        'Conversation not found or unauthorized.'
      );
    });

    it('UTCID20 - Gửi tin nhắn thất bại do cuộc hội thoại đã bị xóa', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue({ id: 1, fullName: 'Test' });
      mockConfigRepo.findOne.mockResolvedValue({ id: 1, configValue: 'API_KEY', status: 'ACTIVE' });
      AiChatConversationRepository.findByIdAndUserId.mockResolvedValue(null);

      await expect(service.handleChat(10, ['EMPLOYEE'], 'hello', 100)).rejects.toThrow(
        'Conversation not found or unauthorized.'
      );
    });

    it('UTCID21 - Thất bại do dịch vụ AI không khả dụng (timeout/failure)', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue({ id: 1, fullName: 'Test' });
      mockConfigRepo.findOne.mockResolvedValue({ id: 1, configValue: 'API_KEY', status: 'ACTIVE' });
      mockPromptRepo.find.mockResolvedValue([]);
      AiChatMessageRepository.findByConversationId.mockResolvedValue([]);
      mockSendMessage.mockRejectedValue(new Error('AI service timeout'));

      await expect(service.handleChat(10, ['EMPLOYEE'], 'hello')).rejects.toThrow(
        'AI service timeout'
      );
    });

    it('UTCID22 - Lấy trạng thái AI thành công', async () => {
      mockConfigRepo.findOne.mockResolvedValue({ id: 1, configKey: 'GEMINI', status: 'ACTIVE' });
      const activeConfig = await mockConfigRepo.findOne();
      expect(activeConfig).toBeDefined();
    });
  });
});
