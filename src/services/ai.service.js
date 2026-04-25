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
  // map từ khóa câu hỏi sang các bảng có khả năng liên quan, giúp tối ưu schema truyền vào Gemini
  // Lương, phụ cấp
  { keywords: ['lương', 'salary', 'thu nhập', 'luong', 'phụ cấp', 'allowance', 'lương cơ bản', 'kiếm', 'bảng lương cơ bản'], tables: ['employee_salaries', 'job_grades', 'employees'] },
  // Payroll tổng hợp
  { keywords: ['payroll', 'bảng lương', 'quyết toán lương', 'bảng tính lương', 'net salary'], tables: ['payrolls', 'payroll_details', 'employee_salaries'] },
  // Phép, nghỉ phép
  { keywords: ['phép', 'nghỉ phép', 'leave', 'ngày phép', 'phép còn', 'nghỉ', 'còn bao nhiêu ngày'], tables: ['leave_balances', 'leave_types', 'leave_policies', 'employees'] },
  // Đơn từ
  { keywords: ['đơn', 'đơn từ', 'yêu cầu', 'request', 'đơn nghỉ', 'nộp đơn', 'phê duyệt', 'đơn chờ'], tables: ['requests', 'request_types', 'request_groups'] },
  // Chấm công - truy vấn tổng quát
  { keywords: ['chấm công', 'điểm danh', 'check in', 'check out', 'muộn', 'trễ', 'về sớm', 'vắng', 'có mặt', 'buổi', 'attendance', 'bảng cấm công'], tables: ['processed_attendance_records', 'attendance_records', 'employees'] },
  // Liệt kê ngày cụ thể - "những ngày nào", "các ngày"
  { keywords: ['những ngày nào', 'ngày nào', 'các ngày', 'ngày làm việc', 'danh sách ngày', 'liệt kê ngày', 'danh sách công', 'công'], tables: ['processed_attendance_records', 'attending_records', 'employees'] },
  // Tổng công tháng (timesheet)
  { keywords: ['tổng công', 'ngày công', 'timesheet', 'time sheet', 'tháng này', 'cả tháng', 'chấm bao nhiêu', 'bảng cấm công'], tables: ['time_sheets', 'processed_attendance_records', 'employees'] },
  // Tăng ca, OT
  { keywords: ['ot', 'tăng ca', 'overtime', 'làm thêm', 'ngoài giờ'], tables: ['overtime_request_details', 'overtime_rules', 'overtime_types', 'requests'] },
  // Hợp đồng
  { keywords: ['hợp đồng', 'contract', 'loại hợp đồng', 'kƹ hợp đồng'], tables: ['contracts', 'employees'] },
  // Ngân hàng
  { keywords: ['ngân hàng', 'bank', 'tài khoản', 'stk'], tables: ['employee_bank_accounts', 'employees'] },
  // Phạt, vi phạm
  { keywords: ['đi muộn', 'về sớm', 'phạt', 'vi phạm', 'penalty', 'trừ công', 'bị trừ', 'tiếng công'], tables: ['penalties'] },
  // Ngày lễ
  { keywords: ['nghỉ lễ', 'lịch lễ', 'holiday', 'lễ', 'ngày lễ', 'ngày tết', 'tết'], tables: ['holiday_list', 'holiday_groups'] },
  // Ca làm việc, lịch ca
  { keywords: ['ca làm', 'ca làm việc', 'shift', 'ca trực', 'lịch ca', 'giờ vào', 'giờ ra', 'giờ làm', 'phân ca'], tables: ['working_shifts', 'shift_assignments', 'shift_schedules', 'shift_groups', 'employees'] },
  // Nhân viên / phòng ban
  { keywords: ['nhân viên', 'nhân sự', 'employee', 'staff', 'người', 'ai', 'họ tên', 'phòng ban', 'department', 'chức danh', 'vị trí'], tables: ['employees', 'departments', 'positions', 'job_grades'] },
];
// Luôn giữ một số bảng nền tảng để AI có ngữ cảnh chung dù câu hỏi không đề cập trực tiếp đến chúng
const BASE_TABLES = ['employees', 'departments'];

// ============================================================================
// SCHEMA PARSER
// - Parse từng CREATE TABLE
// - Lấy mô tả bảng + danh sách cột
// - Biến schema DB thành text dễ hiểu để đưa vào prompt cho AI
// ============================================================================
function parseSchemaFile() {  
  // đọc file databsedescription.txt, nếu không có thì trả về dict rỗng và log cảnh báo
  const schemaFilePath = path.resolve(__dirname, '../../databsedescription.txt');
  if (!fs.existsSync(schemaFilePath)) {
    console.warn('[AiService] databsedescription.txt not found, falling back to empty schema.');
    return {};
  }

  const content = fs.readFileSync(schemaFilePath, 'utf-8');
  const tableDict = {};

  // Tách file thành từng đoạn, mỗi đoạn tương ứng một CREATE TABLE
  const segments = content.split(/(?=CREATE TABLE)/g);

  for (const segment of segments) {
    // Lấy tên bảng từ dòng CREATE TABLE `table_name`
    const tableMatch = segment.match(/CREATE TABLE `([^`]+)`/);
    if (!tableMatch) continue;
    const tableName = tableMatch[1];

    // Lấy phần comment trước CREATE TABLE
    // Dùng làm mô tả chức năng của bảng
    const commentLines = [];
    const lines = segment.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('CREATE TABLE')) break;
      if (trimmed.startsWith('--')) commentLines.push(trimmed);
    }

    // Lấy các dòng định nghĩa cột bên trong CREATE TABLE
    const columnLines = [];
    let insideCreate = false;
    for (const line of lines) {
      const trimmed = line.trim();
      // Bắt đầu đọc phần định nghĩa cột sau CREATE TABLE
      if (trimmed.startsWith('CREATE TABLE')) { insideCreate = true; continue; }
      if (!insideCreate) continue;
      if (trimmed.startsWith('PRIMARY') || trimmed.startsWith('KEY') || trimmed.startsWith('CONSTRAINT') || trimmed.startsWith('UNIQUE') || trimmed.startsWith(') ENGINE')) break;
      if (!trimmed.startsWith('`')) continue;
      // Tách tên cột và kiểu dữ liệu
      const colMatch = trimmed.match(/`([^`]+)`\s+(\w+(?:\([\d,]+\))?)/);
      if (!colMatch) continue;
      const colName = colMatch[1];
      const colType = colMatch[2];
      // Lấy comment cuối dòng cột nếu có
      const commentMatch = trimmed.match(/--\s*(.+)$/);
      const colComment = commentMatch ? ` -- ${commentMatch[1]}` : '';
      columnLines.push(`  ${colName} (${colType})${colComment}`);
    }

    if (columnLines.length > 0) {
      const commentBlock = commentLines.length > 0 ? commentLines.join('\n') + '\n' : '';
      tableDict[tableName] = `${commentBlock}Bảng \`${tableName}\`:\n${columnLines.join('\n')}`;
    }
  }

  console.log(`[AiService] Schema parsed: ${Object.keys(tableDict).length} tables loaded from databsedescription.txt`);
  return tableDict;
}

function getRelevantTables(question) {
  // Dựa vào câu hỏi, xác định bảng nào có khả năng liên quan để chỉ truyền schema cần thiết vào Gemini
  const q = question.toLowerCase();
  const relevantTables = new Set(BASE_TABLES);
  // Nếu câu hỏi chứa keyword nào thì thêm các bảng tương ứng
  for (const entry of KEYWORD_TABLE_MAP) {
    if (entry.keywords.some(kw => q.includes(kw))) {
      entry.tables.forEach(t => relevantTables.add(t));
    }
  }

  return Array.from(relevantTables);
}

// ============================================================================
// AI SERVICE CLASS
// - quản lý hội thoại chat AI
// - dựng prompt
// - gọi model Gemini
// - cho model gọi tool query DB
// - lưu lịch sử chat
// ============================================================================
export class AiService {
  constructor() {
    this.schemaDict = parseSchemaFile();
  }
  // Lấy thông tin nhân viên gắn với user hiện tại
  // Dùng để cá nhân hóa prompt và phân quyền dữ liệu
  async getEmployeeInfo(userId) {
    const employeeRepo = AppDataSource.getRepository(EmployeeEntity);
    return await employeeRepo.findOne({
      where: { userId, isDeleted: false },
      relations: ['department'],
    });
  }
  // Từ câu hỏi hiện tại → chọn ra đúng schema liên quan
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
  // - lấy danh sách hội thoại
  // - tạo hội thoại mới
  // - xóa hội thoại
  // - đọc tin nhắn trong hội thoại
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
  // Đây là hàm quan trọng nhất:
  // - nhận câu hỏi từ frontend/chatbox
  // - tìm user / employee
  // - tạo hoặc lấy conversation
  // - lưu message user
  // - dựng prompt + tools + config
  // - gọi Gemini
  // - nếu Gemini yêu cầu query DB thì backend sẽ chạy tool
  // - lấy kết quả cuối và lưu lại message assistant
  async handleChat(userId, roles, content, conversationId) {
    // B1. Lấy thông tin nhân viên hiện tại
    const employee = await this.getEmployeeInfo(userId);
    if (!employee) {
      throw new Error('Employee not found for the given user.');
    }

    // B2. Nếu có conversationId thì lấy hội thoại cũ
    // Nếu chưa có thì tự tạo hội thoại mới
    let conversation;
    if (conversationId) {
      conversation = await AiChatConversationRepository.findByIdAndUserId(conversationId, userId);
      if (!conversation) throw new Error('Conversation not found or unauthorized.');
    } else {
      // Auto-create a new conversation
      const title = content.substring(0, 50) || 'Cuộc hội thoại mới';
      conversation = await this.createConversation(userId, title);
    }

    // B3. Lưu message người dùng vào DB
    await AiChatMessageRepository.saveMessage({
      conversationId: conversation.id,
      role: 'user',
      content,
    });

     // B4. Lấy toàn bộ lịch sử chat để build history cho model
    const allMessages = await AiChatMessageRepository.findByConversationId(conversation.id);

    // B5. Chỉ lấy schema liên quan tới câu hỏi hiện tại
    const schemaText = this.getRelevantSchema(content);

    // B6. Khai báo tool để model có thể gọi
    // Ở đây model có 1 tool là query_database
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
// B7. Tạo system prompt chính
    // Đây là nơi mô tả:
    // - AI đóng vai trò gì
    // - user hiện tại là ai
    // - schema nào liên quan
    // - rule SQL bắt buộc
    // - rule phân quyền
    // - mẫu JOIN hay dùng
    const systemInstruction = `Bạn là Trợ lý AI Nhân sự thông minh của SkyBreath SmartHR. Nhiệm vụ: nhận câu hỏi tiếng Việt → tự sinh câu SQL → query vào database → trả lời bằng tiếng Việt thân thiện.

THÔNG TIN NGƯỜI DÙNG:
- Tên: ${employee.fullName}
- Mã NV: ${employee.employeeCode}
- employee_id: ${employee.id}
- Vai trò: ${roles.join(', ')}
- Ngày hiện tại: ${new Date().toISOString().split('T')[0]}

CÁC BẢNG SCHEMA LIÊN QUAN ĐẾN CÂU HỎI NÀY:
${schemaText}

--- QUY TẮC SQL BẮT BUỘC ---
1. LUÔN thêm \`is_deleted = 0\` vào mọi bảng query.
2. Tìm kiếm nhân viên theo tên: dùng \`e.full_name LIKE '%Tên%'\` (tìm gần đúng).
3. Lương hiện tại: JOIN employee_salaries với \`salary_status = 'ACTIVE'\`.
4. Ngày phép còn lại = lp.days_per_year - lb.used_days (JOIN leave_balances → leave_types → leave_policies).
5. Bảng \`leave_balances\` KHÔNG có cột \`total_days\`. Lấy tổng phép từ \`leave_policies.days_per_year\`.
6. Bảng \`requests\` dùng cột \`status\` (DRAFT/SUBMITTED/APPROVED/REJECTED/CANCELLED).
7. Tổng công tháng: \`processed_attendance_records\` (SUM(work_value)) hoặc \`time_sheets\` (total_working_days).
8. Ca làm việc của nhân viên: JOIN shift_assignments (employee_id) => working_shifts.
9. Phạt đi muộn: Bảng \`penalties\` - tìm theo \`violation_type='LATE'\`, \`from_minute <= X AND to_minute >= X\`, \`status='ACTIVE'\`.
10. Dùng MONTH() và YEAR() để lọc theo tháng/năm. Tháng này: MONTH(CURDATE()), YEAR(CURDATE()).
11. Bảo mật: TUYỆT ĐỐI KHÔNG query bảng \`ai_configurations\`, \`users\` (cột password/refresh_token).
12. Chỉ dùng SELECT, KHÔNG dùng INSERT/UPDATE/DELETE.

--- PHÂN QUYỀN ---
- EMPLOYEE: CHỈ được xem dữ liệu của chính họ (thêm \`AND e.id = ${employee.id}\` hoặc \`employee_id = ${employee.id}\`).
- HR/ADMIN: Xem toàn bộ, JOIN bất kỳ bảng nào cần thiết.

--- MẪU JOIN PHỔ BIẾN ---
Lương: FROM employees e JOIN employee_salaries es ON es.employee_id = e.id AND es.salary_status='ACTIVE' AND es.is_deleted=0
Phép còn: FROM employees e JOIN leave_balances lb ON lb.employee_id=e.id AND lb.year=YEAR(CURDATE()) AND lb.is_deleted=0 JOIN leave_types lt ON lt.id=lb.leave_type_id AND lt.is_deleted=0 JOIN leave_policies lp ON lp.leave_type_id=lt.id AND lp.is_deleted=0
Công tháng: FROM employees e JOIN processed_attendance_records par ON par.employee_id=e.id AND par.is_deleted=0 WHERE MONTH(par.work_date)=M AND YEAR(par.work_date)=Y
Phòng ban: FROM employees e JOIN departments d ON d.id=e.department_id AND d.is_deleted=0 JOIN positions p ON p.id=e.position_id AND p.is_deleted=0
Ca làm việc: FROM employees e JOIN shift_assignments sa ON sa.employee_id=e.id AND sa.is_deleted=0 AND (sa.effective_to IS NULL OR sa.effective_to>=CURDATE()) JOIN working_shifts ws ON ws.id=sa.shift_id AND ws.is_deleted=0
Phạt muộn: FROM penalties WHERE violation_type='LATE' AND status='ACTIVE' AND is_deleted=0 AND from_minute<=X AND to_minute>=X AND effective_from<=CURDATE() AND (effective_to IS NULL OR effective_to>=CURDATE())

Sau khi nhận kết quả SQL, trình bày ngắn gọn, dễ hiểu bằng tiếng Việt. Không lộ câu SQL gốc.`;
// B8. Nạp thêm các prompt/rule do admin cấu hình động trong DB
    const activePrompts = await AppDataSource.getRepository(AiPromptEntity).find({ where: { status: 'ACTIVE' } });
    let additionalRules = '';
    if (activePrompts && activePrompts.length > 0) {
      additionalRules = '\n\n--- CÁC QUY TẮC / MẪU BỔ SUNG TỪ ADMIN ---\n';
      activePrompts.forEach(p => {
         additionalRules += `\n[${p.promptKey}]:\n${p.promptContent}\n`;
      });
    }

    const finalSystemInstruction = systemInstruction + additionalRules;
// B9. Lấy AI config đang ACTIVE
    const activeConfig = await AppDataSource.getRepository(AiConfigurationEntity).findOne({ where: { status: 'ACTIVE' } });
    if (!activeConfig || !activeConfig.configValue) {
      throw new Error('Cấu hình AI chưa được thiết lập, vui lòng báo quản trị viên.');
    }
 // B10. Khởi tạo Gemini client bằng API key
    const genAI = new GoogleGenerativeAI(activeConfig.configValue);
    const modelToUse = activeConfig.aiModel || 'gemini-2.5-flash';
     // B11. Tạo model với systemInstruction và tools
    const model = genAI.getGenerativeModel({
      model: modelToUse,
      systemInstruction: finalSystemInstruction,
      tools: tools,
    });

    // B12. Build history hội thoại cho Gemini
    const historyData = allMessages.slice(0, -1).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    // Gemini yêu cầu history bắt đầu bằng user
    while (historyData.length > 0 && historyData[0].role === 'model') {
      historyData.shift();
    }
// B13. Tạo chat session với history cũ
    const chatSession = model.startChat({ history: historyData });
 // B14. Gửi câu hỏi hiện tại lên Gemini
    let result;
    try {
      result = await chatSession.sendMessage(content);
    } catch (err) {
      console.error('Lỗi gửi message:', err);
      throw err;
    }
// B15. Đọc text trả lời ban đầu
    let finalResponseText = result.response.text();       //lấy text trả lời của Gemini, có thể là câu trả lời trực tiếp hoặc câu trả lời sau khi thực thi tool
    let functionCalls = result.response.functionCalls();
    let functionCallName = null;
    let functionArgs = null;
    let functionResponse = null;
// B16. Nếu model yêu cầu gọi tool thì backend thực thi tool thật
    if (functionCalls && functionCalls.length > 0) { // Nếu Gemini trả về function call, chỉ hỗ trợ 1 function call tại thời điểm này
      const call = functionCalls[0];
      functionCallName = call.name;
      functionArgs = call.args;
       // Backend chạy tool query_database
      const toolResult = await this.executeTool(call);
      functionResponse = toolResult;
// Gửi kết quả tool lại cho Gemini để nó viết câu trả lời cuối cùng bằng tiếng Việt thân thiện với người dùng
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

    // B17. Lưu câu trả lời assistant vào DB
    await AiChatMessageRepository.saveMessage({
      conversationId: conversation.id,
      role: 'assistant',
      content: finalResponseText,
      functionCallName,
      functionArgs,
      functionResponse,
    });

     // B18. Cập nhật thời gian hoạt động cuối của hội thoại
    await AiChatConversationRepository.update(conversation.id, { updatedAt: new Date() });
// B19. Trả response về frontend/chatbox
    return {
      content: finalResponseText,
      conversationId: conversation.id,
      conversationTitle: conversation.title,
      action: null,
    };
  }
 // Hàm thực thi tool do AI yêu cầu
  // Hiện tại chỉ có 1 tool là query_database
  async executeTool(call) {
    const { name, args } = call;

    if (name === 'query_database') {
      const sql = args.sql_query;
      console.log('[AI] Executing SQL:', sql);
// Chặn toàn bộ câu lệnh không phải SELECT để bảo vệ DB
      if (!sql.trim().toUpperCase().startsWith('SELECT')) {
        return { error: 'Quyền truy cập bị từ chối: Chỉ cho phép các lệnh SELECT (Read-only).' };
      }

      try {
        // Thực thi SQL raw trên database
        const rawResults = await AppDataSource.query(sql);
        return rawResults;
      } catch (error) {
        console.error('[AI] SQL Query Error:', error.message);
        return { error: 'Lỗi thực thi SQL: ' + error.message };
      }
    }
// Nếu model gọi tool không tồn tại thì trả lỗi
    return { error: 'Công cụ không tồn tại.' };
  }
}
