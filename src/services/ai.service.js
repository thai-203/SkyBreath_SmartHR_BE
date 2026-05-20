import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env.config.js';
import { AppDataSource } from '../database/data-source.js';
import { EmployeeEntity } from '../models/entities/employee.entity.js';
import { AiChatConversationRepository } from '../repositories/ai-chat-conversations.repository.js';
import { AiChatMessageRepository } from '../repositories/ai-chat-messages.repository.js';
import { AiConfigurationEntity } from '../models/entities/ai-configuration.entity.js';
import { AiPromptEntity } from '../models/entities/ai-prompt.entity.js';
import fs from 'fs';
import path from 'path';

// ============================================================================
// KEYWORD → TABLE RELEVANCE MAP
// ============================================================================
const KEYWORD_TABLE_MAP = [
  // Lương cơ bản, bậc lương, phụ cấp
  { keywords: ['lương cơ bản', 'bậc lương', 'grade', 'job grade', 'phụ cấp', 'allowance', 'ăn trưa', 'xăng xe', 'điện thoại'], tables: ['employee_salaries', 'job_grades', 'employees'] },
  // Payroll tổng hợp và chi tiết tháng
  { keywords: ['payroll', 'bảng lương', 'bảng tính lương', 'thu nhập', 'thực nhận', 'thực lĩnh', 'lương gộp', 'gross', 'net', 'khấu trừ', 'đóng bảo hiểm', 'bhxh', 'bhyt', 'bhtn', 'thuế', 'tncn', 'thuế thu nhập', 'phụ thuộc', 'người phụ thuộc', 'giảm trừ', 'công đoàn', 'phí công đoàn'], tables: ['payrolls', 'payroll_details', 'employee_salaries', 'employee_dependents'] },
  // Phép, nghỉ phép
  { keywords: ['phép', 'nghỉ phép', 'leave', 'ngày phép', 'phép còn', 'còn bao nhiêu ngày', 'nghỉ ốm', 'không lương'], tables: ['leave_balances', 'leave_types', 'leave_policies', 'employees'] },
  // Đơn từ
  { keywords: ['đơn', 'yêu cầu', 'request', 'đơn nghỉ', 'nộp đơn', 'phê duyệt', 'đơn chờ', 'duyệt chưa', 'trạng thái đơn'], tables: ['requests', 'request_types', 'request_groups'] },
  // Chấm công, bảng công
  { keywords: ['chấm công', 'điểm danh', 'check in', 'check-in', 'check out', 'check-out', 'muộn', 'trễ', 'về sớm', 'vắng', 'có mặt', 'buổi công', 'attendance', 'ngày làm việc', 'thực tế làm', 'timesheet', 'tổng công', 'ngày công', 'chốt công', 'khóa công'], tables: ['processed_attendance_records', 'attendance_records', 'time_sheets', 'employees'] },
  // Tăng ca, OT
  { keywords: ['ot', 'tăng ca', 'overtime', 'làm thêm', 'ngoài giờ', 'làm bù'], tables: ['overtime_request_details', 'overtime_rules', 'overtime_types', 'requests', 'employees'] },
  // Hợp đồng
  { keywords: ['hợp đồng', 'contract', 'loại hợp đồng', 'ký hợp đồng', 'số giờ làm'], tables: ['contracts', 'employees'] },
  // Ngân hàng
  { keywords: ['ngân hàng', 'bank', 'tài khoản', 'stk', 'số tài khoản'], tables: ['employee_bank_accounts', 'employees'] },
  // Phạt, vi phạm
  { keywords: ['đi muộn', 'đi trễ', 'về sớm', 'phạt', 'vi phạm', 'penalty', 'trừ công', 'bị trừ', 'tiếng công'], tables: ['penalties', 'employees'] },
  // Ngày lễ
  { keywords: ['nghỉ lễ', 'lịch lễ', 'holiday', 'lễ', 'ngày lễ', 'ngày tết', 'tết'], tables: ['holiday_list', 'holiday_groups'] },
  // Ca làm việc, lịch ca
  { keywords: ['ca làm', 'ca làm việc', 'shift', 'ca trực', 'lịch ca', 'giờ vào', 'giờ ra', 'phân ca', 'giao ca'], tables: ['working_shifts', 'shift_assignments', 'shift_schedules', 'shift_groups', 'employees'] },
  // Nhân viên / phòng ban
  { keywords: ['nhân viên', 'nhân sự', 'employee', 'staff', 'phòng ban', 'department', 'chức danh', 'vị trí', 'chức vụ', 'quản lý', 'trưởng phòng'], tables: ['employees', 'departments', 'positions', 'job_grades'] },
];

const BASE_TABLES = ['employees', 'departments'];

// ============================================================================
// SCHEMA PARSER
// ============================================================================
// ============================================================================
// SCHEMA & EXAMPLE PARSER
// ============================================================================
function parseSchemaFile() {
  const schemaFilePath = path.resolve(__dirname, '../../databsedescription.txt');
  if (!fs.existsSync(schemaFilePath)) {
    console.warn('[AiService] databsedescription.txt not found, falling back to empty schema.');
    return {};
  }

  const content = fs.readFileSync(schemaFilePath, 'utf-8');
  const tableDict = {};

  // Split into segments by CREATE TABLE
  const segments = content.split(/(?=CREATE TABLE)/g);

  for (const segment of segments) {
    // Find CREATE TABLE header
    const tableMatch = segment.match(/CREATE TABLE `([^`]+)`/);
    if (!tableMatch) continue;
    const tableName = tableMatch[1];

    // Capture column definitions with inline comments
    const columnLines = [];
    const lines = segment.split('\n');
    let insideCreate = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('CREATE TABLE')) { insideCreate = true; continue; }
      if (!insideCreate) continue;
      if (trimmed.startsWith('PRIMARY') || trimmed.startsWith('KEY') || trimmed.startsWith('CONSTRAINT') || trimmed.startsWith('UNIQUE') || trimmed.startsWith(') ENGINE') || trimmed.startsWith(');')) break;
      if (!trimmed.startsWith('`')) continue;
      const colMatch = trimmed.match(/`([^`]+)`\s+(\w+(?:\([\d,]+\))?)/);
      if (!colMatch) continue;
      const colName = colMatch[1];
      let colType = colMatch[2].toLowerCase()
        .replace('datetime(6)', 'datetime')
        .replace('varchar(255)', 'varchar')
        .replace('decimal(15,2)', 'decimal');
      // Extract inline comment
      const commentMatch = trimmed.match(/--\s*(.+)$/);
      const colComment = commentMatch ? ` -- ${commentMatch[1].trim()}` : '';
      columnLines.push(`  ${colName} (${colType})${colComment}`);
    }

    if (columnLines.length > 0) {
      tableDict[tableName] = `Bảng \`${tableName}\`:\n${columnLines.join('\n')}`;
    }
  }

  console.log(`[AiService] Schema parsed: ${Object.keys(tableDict).length} tables loaded from databsedescription.txt`);
  return tableDict;
}

function parseAnswersqlFile() {
  const filePath = path.resolve(__dirname, '../../answersql.md');
  if (!fs.existsSync(filePath)) {
    console.warn('[AiService] answersql.md not found, falling back to empty examples.');
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const examples = [];
  
  // Split content by Q sections
  const sections = content.split(/### Q\d+\./g);
  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    const firstLineEnd = section.indexOf('\n');
    if (firstLineEnd === -1) continue;
    const header = section.substring(0, firstLineEnd).trim();
    
    // Split header by "/" to get multiple phrasings of the question
    const questions = header.split('/')
      .map(q => q.replace(/Q\d+\.?/i, '').trim())
      .filter(q => q.length > 0);

    const sqlMatch = section.match(/```sql([\s\S]*?)```/);
    if (!sqlMatch) continue;
    const sql = sqlMatch[1].trim();

    examples.push({ questions, sql });
  }

  console.log(`[AiService] Examples parsed: ${examples.length} SQL templates loaded from answersql.md`);
  return examples;
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
    this.schemaDict = parseSchemaFile();
    this.sqlExamples = parseAnswersqlFile();
  }

  async getEmployeeInfo(userId) {
    const employeeRepo = AppDataSource.getRepository(EmployeeEntity);
    return await employeeRepo.findOne({
      where: { userId, isDeleted: false },
      relations: ['department'],
    });
  }

  findBestExamples(userQuestion, maxCount = 2) {
    const queryWords = userQuestion.toLowerCase().split(/\s+/).filter(w => w.length > 1);
    if (queryWords.length === 0) return [];
    
    const scored = this.sqlExamples.map(ex => {
      let score = 0;
      for (const exQ of ex.questions) {
        const exQWords = exQ.toLowerCase().split(/\s+/).filter(w => w.length > 1);
        const intersection = queryWords.filter(w => exQWords.includes(w));
        const currentScore = intersection.length / Math.max(queryWords.length, exQWords.length);
        if (currentScore > score) {
          score = currentScore;
        }
      }
      return { example: ex, score };
    });

    return scored
      .filter(s => s.score > 0.05)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxCount)
      .map(s => s.example);
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

    // Find and format matching SQL examples
    const bestExamples = this.findBestExamples(content);
    let exampleText = '';
    if (bestExamples.length > 0) {
      exampleText = '\n\n--- CÁC VÍ DỤ TRUY VẤN MẪU TƯƠNG TỰ (THAM KHẢO & LÀM THEO CÚ PHÁP) ---\n';
      bestExamples.forEach((ex, idx) => {
        // Replace placeholders in example with active employee variables
        let sqlExample = ex.sql
          .replace(/:my_employee_id/g, employee.id)
          .replace(/:employee_id/g, employee.id);
        exampleText += `Ví dụ ${idx + 1} (Câu hỏi tương đồng: "${ex.questions[0]}"):\n\`\`\`sql\n${sqlExample}\n\`\`\`\n`;
      });
    }

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

    const systemInstruction = `# Vai trò
Bạn là Trợ lý AI SkyBreath SmartHR. Nhiệm vụ: Nhận câu hỏi tiếng Việt -> sinh câu lệnh SQL SELECT chuẩn xác (MySQL) -> gọi tool \`query_database\` -> dùng kết quả trả về để trả lời thân thiện (KHÔNG tiết lộ câu SQL hoặc cấu trúc bảng trong câu trả lời cuối cùng).

# Thông tin người dùng đang đăng nhập
- Tên: ${employee.fullName} | Mã NV: ${employee.employeeCode} | ID: ${employee.id}
- Vai trò: ${roles.join(', ')} | Ngày hiện tại: ${new Date().toISOString().split('T')[0]}

# Các bảng cơ sở dữ liệu liên quan (Schema)
${schemaText}
${exampleText}

# Quy tắc sinh SQL bắt buộc
1. **Lọc xóa mềm**: Bắt buộc thêm \`is_deleted = 0\` cho MỌI bảng được JOIN hoặc truy vấn.
2. **Tìm kiếm theo tên**: Luôn sử dụng \`LIKE '%Tên%'\` (không phân biệt hoa thường) để tìm kiếm tên nhân viên.
3. **Phân quyền và bảo mật (RBAC)**:
   - Nếu vai trò chỉ có **EMPLOYEE**: Bắt buộc lọc theo ID của chính họ (\`e.id = ${employee.id}\` hoặc \`employee_id = ${employee.id}\`) trên mọi bảng để họ không thể xem thông tin của người khác.
   - Nếu có vai trò **HR** hoặc **ADMIN**: Được quyền xem toàn bộ hệ thống, trừ khi họ trực tiếp hỏi về bản thân.
4. **Chỉ dùng SELECT**: Tuyệt đối không dùng INSERT/UPDATE/DELETE/DROP. Cấm truy vấn \`ai_configurations\` và các cột nhạy cảm của \`users\` (password, token).

# Công thức tính nghiệp vụ chuẩn xác
- **Lương hiện tại**: JOIN \`employee_salaries\` với \`salary_status = 'ACTIVE'\`.
- **Chi tiết lương tháng (Payroll)**: JOIN \`payroll_details pd\` và \`payrolls p\` qua \`payroll_id\`. Bộ lọc thời gian dùng \`p.payroll_month = X\` và \`p.payroll_year = Y\`.
  - Thực lĩnh (Net Salary): pd.net_salary
  - Tổng thu nhập gộp (Gross Salary): pd.total_gross_income
  - Khấu trừ bảo hiểm/thuế/công đoàn: pd.total_deduction
- **Số ngày phép năm còn lại**: \`lp.days_per_year - lb.used_days\` (JOIN \`leave_balances lb\` -> \`leave_types lt (id=1)\` -> \`leave_policies lp\`). Lọc theo \`lb.year = YEAR(CURDATE())\`.
- **Tổng công tháng**: SUM(work_value) từ \`processed_attendance_records\` hoặc \`total_working_days\` từ \`time_sheets\`.
- **Tăng ca/OT**: JOIN \`overtime_request_details\` hoặc dùng cột \`total_ot_hours\`, \`overtime_pay\` từ \`payroll_details\` tùy câu hỏi.
- **Lịch ca làm việc**: JOIN \`shift_assignments sa\` và \`working_shifts ws\`. Lọc \`(sa.effective_to IS NULL OR sa.effective_to >= CURDATE())\`.

Hãy sinh câu lệnh SQL tối ưu nhất và trả lời kết quả thân thiện bằng tiếng Việt.`;

    const activePrompts = await AppDataSource.getRepository(AiPromptEntity).find({ where: { status: 'ACTIVE' } });
    let additionalRules = '';
    if (activePrompts && activePrompts.length > 0) {
      additionalRules = '\n\n--- CÁC QUY TẮC / MẪU BỔ SUNG TỪ ADMIN ---\n';
      activePrompts.forEach(p => {
        additionalRules += `\n[${p.promptKey}]:\n${p.promptContent}\n`;
      });
    }

    const finalSystemInstruction = systemInstruction + additionalRules;

    const activeConfig = await AppDataSource.getRepository(AiConfigurationEntity).findOne({ where: { status: 'ACTIVE' } });
    if (!activeConfig || !activeConfig.configValue) {
      throw new Error('Cấu hình AI chưa được thiết lập, vui lòng báo quản trị viên.');
    }

    const genAI = new GoogleGenerativeAI(activeConfig.configValue);
    const modelToUse = activeConfig.aiModel || 'gemini-2.5-flash';

    const model = genAI.getGenerativeModel({
      model: modelToUse,
      systemInstruction: finalSystemInstruction,
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
