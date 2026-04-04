import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env.config.js';
import { AppDataSource } from '../database/data-source.js';
import { EmployeeEntity } from '../models/entities/employee.entity.js';
import { AiChatConversationRepository } from '../repositories/ai-chat-conversations.repository.js';
import { AiChatMessageRepository } from '../repositories/ai-chat-messages.repository.js';
import fs from 'fs';
import path from 'path';

// ============================================================================
// KEYWORD → TABLE RELEVANCE MAP
// ============================================================================
const KEYWORD_TABLE_MAP = [
  { keywords: ['phép', 'nghỉ phép', 'leave', 'ngày phép', 'phep'], tables: ['leave_balances', 'leave_types', 'leave_policies'] },
  { keywords: ['đơn', 'đơn từ', 'yêu cầu', 'request', 'đơn nghỉ', 'don'], tables: ['requests', 'request_types', 'request_groups'] },
  { keywords: ['lương', 'salary', 'thu nhập', 'luong', 'phụ cấp', 'allowance'], tables: ['employee_salaries', 'job_grades'] },
  { keywords: ['bảng lương', 'payroll', 'tính lương', 'net salary', 'bang luong'], tables: ['payrolls', 'payroll_details'] },
  { keywords: ['chấm công', 'điểm danh', 'check in', 'check out', 'muộn', 'trễ', 'về sớm', 'cham cong', 'diem danh', 'attendance'], tables: ['processed_attendance_records', 'attendance_records', 'working_shifts'] },
  { keywords: ['ot', 'tăng ca', 'overtime', 'tang ca', 'làm thêm'], tables: ['time_sheets', 'overtime_request_details', 'overtime_rules', 'overtime_types'] },
  { keywords: ['công', 'ngày công', 'timesheet', 'time sheet', 'cong', 'tháng này'], tables: ['time_sheets', 'processed_attendance_records'] },
  { keywords: ['hợp đồng', 'contract', 'hop dong'], tables: ['contracts'] },
  { keywords: ['ngân hàng', 'bank', 'tài khoản', 'ngan hang'], tables: ['employee_bank_accounts'] },
  { keywords: ['phạt', 'vi phạm', 'penalty', 'phat'], tables: ['penalties'] },
  { keywords: ['kỳ nghỉ', 'holiday', 'lễ', 'ngày lễ', 'holiday_list'], tables: ['holiday_list', 'holiday_groups'] },
  { keywords: ['onboarding', 'thử việc', 'thu viec', 'gia nhập'], tables: ['onboarding_plans', 'onboarding_progress', 'onboarding_tasks'] },
  { keywords: ['ca làm', 'ca làm việc', 'shift', 'ca trực', 'lịch ca'], tables: ['working_shifts', 'shift_assignments', 'shift_schedules'] },
  { keywords: ['nhân viên', 'nhan vien', 'employee', 'người', 'ai', 'staff', 'họ tên', 'phòng ban', 'department'], tables: ['employees', 'departments', 'positions'] },
];

const BASE_TABLES = ['employees', 'departments'];

// ============================================================================
// SCHEMA PARSER
// ============================================================================
function parseSchemaFile() {
  const schemaFilePath = path.resolve(__dirname, '../../databsedescription.txt');
  if (!fs.existsSync(schemaFilePath)) {
    console.warn('[AiService] databsedescription.txt not found, falling back to empty schema.');
    return {};
  }

  const content = fs.readFileSync(schemaFilePath, 'utf-8');
  const tableDict = {};

  const tableRegex = /CREATE TABLE `([^`]+)` \(([\\s\\S]*?)\) ENGINE=/g;
  let match;
  while ((match = tableRegex.exec(content)) !== null) {
    const tableName = match[1];
    const columnBlock = match[2];

    const columns = columnBlock
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('`') && !line.startsWith('`id`') === false || line.startsWith('`'))
      .filter(line => !line.startsWith('PRIMARY') && !line.startsWith('KEY') && !line.startsWith('CONSTRAINT') && !line.startsWith('UNIQUE'))
      .map(line => {
        const colMatch = line.match(/`([^`]+)`\s+(\w+(?:\(\d+(?:,\d+)?\))?)/);
        if (colMatch) return `  ${colMatch[1]} (${colMatch[2]})`;
        return null;
      })
      .filter(Boolean)
      .slice(0, 15);

    if (columns.length > 0) {
      tableDict[tableName] = `Table \`${tableName}\`:\n${columns.join('\n')}`;
    }
  }

  console.log(`[AiService] Schema parsed: ${Object.keys(tableDict).length} tables loaded from databsedescription.txt`);
  return tableDict;
}

function getRelevantTables(question) {
  const q = question.toLowerCase();
  const relevantTables = new Set(BASE_TABLES);

  for (const entry of KEYWORD_TABLE_MAP) {
    if (entry.keywords.some(kw => q.includes(kw))) {
      entry.tables.forEach(t => relevantTables.add(t));
    }
  }

  return Array.from(relevantTables);
}

// ============================================================================
// AI SERVICE CLASS
// ============================================================================
export class AiService {
  constructor() {
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    this.modelName = config.gemini.model || 'gemini-2.5-flash';
    this.schemaDict = parseSchemaFile();
  }

  async getEmployeeInfo(userId) {
    const employeeRepo = AppDataSource.getRepository(EmployeeEntity);
    return await employeeRepo.findOne({
      where: { userId, isDeleted: false },
      relations: ['department'],
    });
  }

  getRelevantSchema(question) {
    const relevantTableNames = getRelevantTables(question);
    const parts = [];

    for (const tableName of relevantTableNames) {
      if (this.schemaDict[tableName]) {
        parts.push(this.schemaDict[tableName]);
      }
    }

    if (parts.length === 0) {
      return `Các bảng trong hệ thống: ${Object.keys(this.schemaDict).join(', ')}`;
    }

    return parts.join('\n\n');
  }

  // ── Conversation management ──────────────────────────────────────────────

  async getConversations(userId) {
    return AiChatConversationRepository.findByUserId(userId);
  }

  async createConversation(userId, title = 'Cuộc hội thoại mới') {
    const conv = AiChatConversationRepository.create({ userId, title, isActive: 1 });
    return AiChatConversationRepository.save(conv);
  }

  async deleteConversation(conversationId, userId) {
    const conv = await AiChatConversationRepository.findByIdAndUserId(conversationId, userId);
    if (!conv) throw new Error('Conversation not found or unauthorized.');
    await AiChatConversationRepository.softDelete(conversationId);
  }

  async getMessages(conversationId, userId) {
    // Validate ownership
    const conv = await AiChatConversationRepository.findByIdAndUserId(conversationId, userId);
    if (!conv) throw new Error('Conversation not found or unauthorized.');
    return AiChatMessageRepository.findByConversationId(conversationId);
  }

  // ── Main chat handler ────────────────────────────────────────────────────

  async handleChat(userId, roles, content, conversationId) {
    const employee = await this.getEmployeeInfo(userId);
    if (!employee) {
      throw new Error('Employee not found for the given user.');
    }

    // Resolve or create conversation
    let conversation;
    if (conversationId) {
      conversation = await AiChatConversationRepository.findByIdAndUserId(conversationId, userId);
      if (!conversation) throw new Error('Conversation not found or unauthorized.');
    } else {
      // Auto-create a new conversation
      const title = content.substring(0, 50) || 'Cuộc hội thoại mới';
      conversation = await this.createConversation(userId, title);
    }

    // Save user message to DB
    await AiChatMessageRepository.saveMessage({
      conversationId: conversation.id,
      role: 'user',
      content,
    });

    // Load complete history from DB (excluding the just-saved user msg for history building)
    const allMessages = await AiChatMessageRepository.findByConversationId(conversation.id);

    // Schema optimization — based on the current user question
    const schemaText = this.getRelevantSchema(content);

    // Tools
    const tools = [
      {
        functionDeclarations: [
          {
            name: 'query_database',
            description: 'Executes a raw SQL SELECT query on the MySQL database and returns the results. ONLY SELECT queries are allowed.',
            parameters: {
              type: 'OBJECT',
              properties: {
                sql_query: { type: 'STRING', description: 'The exact raw SQL SELECT query to execute' },
                purpose: { type: 'STRING', description: 'What you are trying to find' }
              },
              required: ['sql_query', 'purpose'],
            },
          }
        ],
      },
    ];

    const systemInstruction = `Bạn là Trợ lý AI Nhân sự thông minh của SkyBreath SmartHR. Nhiệm vụ của bạn là trả lời câu hỏi về dữ liệu nội bộ bằng cách TỰ VIẾT CÂU LỆNH SQL và QUERY VÀO DATABASE, sau đó trả lời bằng tiếng Việt thân thiện.

THÔNG TIN NGƯỜI DÙNG:
- Tên: ${employee.fullName}
- Mã NV: ${employee.employeeCode}
- employee_id: ${employee.id}
- Vai trò: ${roles.join(', ')}
- Ngày hiện tại: ${new Date().toISOString().split('T')[0]}

CÁC BẢNG LIÊN QUAN ĐẾN CÂU HỎI NÀY:
${schemaText}

QUY TẮC SQL:
- Luôn thêm điều kiện \`is_deleted = 0\` trong mỗi mệnh đề WHERE.
- Luôn JOIN bảng \`employees\` (qua employee_id) để lấy full_name khi cần hiển thị tên.
- Với câu hỏi về "tháng này": dùng MONTH(CURDATE()) và YEAR(CURDATE()).
- QUAN TRỌNG: Bảng \`requests\` dùng cột \`request_status\` (không phải \`status\`), cột \`request_content\` (không phải \`content\`).
- QUAN TRỌNG: Bảng \`leave_balances\` KHÔNG có cột \`total_days\`. Tổng phép = lấy từ bảng \`leave_policies\` (cột \`days_per_year\`).

PHÂN QUYỀN:
- Nếu vai trò là EMPLOYEE: BẮT BUỘC chỉ truy vấn dữ liệu của chính họ (thêm \`employee_id = ${employee.id}\`).
- Nếu vai trò là HR hoặc ADMIN: Có thể xem toàn bộ, thực hiện aggregation phức tạp.

Sau khi nhận kết quả SQL, hãy trình bày ngắn gọn, dễ hiểu bằng tiếng Việt. Không lộ câu SQL gốc.`;

    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      systemInstruction: systemInstruction,
      tools: tools,
    });

    // Build history for Gemini (all messages except the last user message)
    const historyData = allMessages.slice(0, -1).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    // Gemini requires history to start with 'user'
    while (historyData.length > 0 && historyData[0].role === 'model') {
      historyData.shift();
    }

    const chatSession = model.startChat({ history: historyData });

    let result;
    try {
      result = await chatSession.sendMessage(content);
    } catch (err) {
      console.error('Lỗi gửi message:', err);
      throw err;
    }

    let finalResponseText = result.response.text();
    let functionCalls = result.response.functionCalls();
    let functionCallName = null;
    let functionArgs = null;
    let functionResponse = null;

    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      functionCallName = call.name;
      functionArgs = call.args;
      const toolResult = await this.executeTool(call);
      functionResponse = toolResult;

      const functionResponseResult = await chatSession.sendMessage([{
        functionResponse: {
          name: call.name,
          response: {
            result: JSON.stringify(toolResult)
          },
        }
      }]);

      finalResponseText = functionResponseResult.response.text();
    }

    // Save assistant message to DB
    await AiChatMessageRepository.saveMessage({
      conversationId: conversation.id,
      role: 'assistant',
      content: finalResponseText,
      functionCallName,
      functionArgs,
      functionResponse,
    });

    // Update conversation timestamp
    await AiChatConversationRepository.update(conversation.id, { updatedAt: new Date() });

    return {
      content: finalResponseText,
      conversationId: conversation.id,
      conversationTitle: conversation.title,
      action: null,
    };
  }

  async executeTool(call) {
    const { name, args } = call;

    if (name === 'query_database') {
      const sql = args.sql_query;
      console.log('[AI] Executing SQL:', sql);

      if (!sql.trim().toUpperCase().startsWith('SELECT')) {
        return { error: 'Quyền truy cập bị từ chối: Chỉ cho phép các lệnh SELECT (Read-only).' };
      }

      try {
        const rawResults = await AppDataSource.query(sql);
        return rawResults;
      } catch (error) {
        console.error('[AI] SQL Query Error:', error.message);
        return { error: 'Lỗi thực thi SQL: ' + error.message };
      }
    }

    return { error: 'Công cụ không tồn tại.' };
  }
}
