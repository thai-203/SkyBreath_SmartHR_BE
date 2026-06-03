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

// Mock AppDataSource
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

describe('AiService', () => {
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

  describe('getConversations', () => {
    it('returns conversations from repository', async () => {
      const mockConvs = [{ id: 1, title: 'Chat 1' }];
      AiChatConversationRepository.findByUserId.mockResolvedValue(mockConvs);

      const result = await service.getConversations(10);

      expect(AiChatConversationRepository.findByUserId).toHaveBeenCalledWith(10);
      expect(result).toEqual(mockConvs);
    });
  });

  describe('createConversation', () => {
    it('creates and saves new conversation', async () => {
      const payload = { userId: 10, title: 'Chat 1', isActive: 1 };
      const savedConv = { id: 1, ...payload };
      AiChatConversationRepository.create.mockReturnValue(payload);
      AiChatConversationRepository.save.mockResolvedValue(savedConv);

      const result = await service.createConversation(10, 'Chat 1');

      expect(AiChatConversationRepository.create).toHaveBeenCalledWith(payload);
      expect(AiChatConversationRepository.save).toHaveBeenCalledWith(payload);
      expect(result).toEqual(savedConv);
    });
  });

  describe('deleteConversation', () => {
    it('throws error if conversation not found or unauthorized', async () => {
      AiChatConversationRepository.findByIdAndUserId.mockResolvedValue(null);

      await expect(service.deleteConversation(1, 10)).rejects.toThrow(
        'Conversation not found or unauthorized.'
      );
      expect(AiChatConversationRepository.softDelete).not.toHaveBeenCalled();
    });

    it('soft deletes conversation when authorized', async () => {
      AiChatConversationRepository.findByIdAndUserId.mockResolvedValue({ id: 1, userId: 10 });

      await service.deleteConversation(1, 10);

      expect(AiChatConversationRepository.softDelete).toHaveBeenCalledWith(1);
    });
  });

  describe('getMessages', () => {
    it('throws error if conversation not found or unauthorized', async () => {
      AiChatConversationRepository.findByIdAndUserId.mockResolvedValue(null);

      await expect(service.getMessages(1, 10)).rejects.toThrow(
        'Conversation not found or unauthorized.'
      );
      expect(AiChatMessageRepository.findByConversationId).not.toHaveBeenCalled();
    });

    it('returns messages in conversation when authorized', async () => {
      AiChatConversationRepository.findByIdAndUserId.mockResolvedValue({ id: 1, userId: 10 });
      const mockMsgs = [{ id: 1, content: 'hi' }];
      AiChatMessageRepository.findByConversationId.mockResolvedValue(mockMsgs);

      const result = await service.getMessages(1, 10);

      expect(AiChatMessageRepository.findByConversationId).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockMsgs);
    });
  });

  describe('executeTool', () => {
    it('returns error if tool name is not query_database', async () => {
      const result = await service.executeTool({ name: 'other_tool', args: {} });
      expect(result).toEqual({ error: 'Công cụ không tồn tại.' });
    });

    it('returns error if query is not SELECT', async () => {
      const result = await service.executeTool({
        name: 'query_database',
        args: { sql_query: 'UPDATE employees SET salary = 1000' },
      });
      expect(result).toEqual({
        error: 'Quyền truy cập bị từ chối: Chỉ cho phép các lệnh SELECT (Read-only).',
      });
    });

    it('runs SELECT query on AppDataSource', async () => {
      const mockResult = [{ val: 1 }];
      AppDataSource.query.mockResolvedValue(mockResult);

      const result = await service.executeTool({
        name: 'query_database',
        args: { sql_query: 'SELECT * FROM employees' },
      });

      expect(AppDataSource.query).toHaveBeenCalledWith('SELECT * FROM employees');
      expect(result).toEqual(mockResult);
    });

    it('catches and returns query errors', async () => {
      AppDataSource.query.mockRejectedValue(new Error('Syntax error'));

      const result = await service.executeTool({
        name: 'query_database',
        args: { sql_query: 'SELECT * FROM employees' },
      });

      expect(result).toEqual({ error: 'Lỗi thực thi SQL: Syntax error' });
    });
  });

  describe('handleChat', () => {
    it('throws error if employee info is missing', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue(null);

      await expect(service.handleChat(10, ['EMPLOYEE'], 'hello')).rejects.toThrow(
        'Employee not found for the given user.'
      );
    });

    it('throws error if active AI config is not found in database', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue({ id: 1, fullName: 'A' });
      mockConfigRepo.findOne.mockResolvedValue(null);

      await expect(service.handleChat(10, ['EMPLOYEE'], 'hello')).rejects.toThrow(
        'Cấu hình AI chưa được thiết lập, vui lòng báo quản trị viên.'
      );
    });

    it('executes handleChat successfully without tool calls', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue({ id: 1, fullName: 'Nguyen Van A', employeeCode: 'EMP001' });
      mockConfigRepo.findOne.mockResolvedValue({ status: 'ACTIVE', configValue: 'API_KEY', aiModel: 'model' });
      mockPromptRepo.find.mockResolvedValue([]);
      
      // Setup mock conversation & history
      AiChatConversationRepository.findByIdAndUserId.mockResolvedValue({ id: 22, title: 'New chat' });
      AiChatMessageRepository.findByConversationId.mockResolvedValue([]);

      // Mock Gemini API text reply
      mockSendMessage.mockResolvedValueOnce({
        response: {
          text: () => 'Response text',
          functionCalls: () => [],
          usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50, totalTokenCount: 150 },
        },
      });

      const result = await service.handleChat(10, ['EMPLOYEE'], 'my question', 22);

      expect(AiChatMessageRepository.saveMessage).toHaveBeenNthCalledWith(1, {
        conversationId: 22,
        role: 'user',
        content: 'my question',
      });
      expect(AiChatMessageRepository.saveMessage).toHaveBeenNthCalledWith(2, {
        conversationId: 22,
        role: 'assistant',
        content: 'Response text',
        functionCallName: null,
        functionArgs: null,
        functionResponse: null,
      });
      expect(AiChatConversationRepository.update).toHaveBeenCalledWith(22, expect.any(Object));
      expect(result).toEqual({
        content: 'Response text',
        conversationId: 22,
        conversationTitle: 'New chat',
        action: null,
      });
    });

    it('executes handleChat successfully with query_database tool calls', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue({ id: 1, fullName: 'Nguyen Van A', employeeCode: 'EMP001' });
      mockConfigRepo.findOne.mockResolvedValue({ status: 'ACTIVE', configValue: 'API_KEY', aiModel: 'model' });
      mockPromptRepo.find.mockResolvedValue([]);
      
      AiChatConversationRepository.findByIdAndUserId.mockResolvedValue({ id: 22, title: 'New chat' });
      AiChatMessageRepository.findByConversationId.mockResolvedValue([]);

      // 1. Initial Gemini call requests a function call
      mockSendMessage.mockResolvedValueOnce({
        response: {
          text: () => '',
          functionCalls: () => [{
            name: 'query_database',
            args: { sql_query: 'SELECT * FROM employees', purpose: 'find staff' }
          }],
          usageMetadata: { promptTokenCount: 100, candidatesTokenCount: 50, totalTokenCount: 150 },
        },
      });

      // Mock database query result
      AppDataSource.query.mockResolvedValueOnce([{ id: 1, fullName: 'Nguyen Van A' }]);

      // 2. Second Gemini call with function response returns final text
      mockSendMessage.mockResolvedValueOnce({
        response: {
          text: () => 'Found 1 employee: Nguyen Van A',
          functionCalls: () => [],
          usageMetadata: { promptTokenCount: 150, candidatesTokenCount: 80, totalTokenCount: 230 },
        },
      });

      const result = await service.handleChat(10, ['ADMIN'], 'find staff', 22);

      expect(AppDataSource.query).toHaveBeenCalledWith('SELECT * FROM employees');
      expect(AiChatMessageRepository.saveMessage).toHaveBeenLastCalledWith({
        conversationId: 22,
        role: 'assistant',
        content: 'Found 1 employee: Nguyen Van A',
        functionCallName: 'query_database',
        functionArgs: { sql_query: 'SELECT * FROM employees', purpose: 'find staff' },
        functionResponse: [{ id: 1, fullName: 'Nguyen Van A' }],
      });
      expect(result.content).toBe('Found 1 employee: Nguyen Van A');
    });
  });
});
