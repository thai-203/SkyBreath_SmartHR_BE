import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/env.config.js';
import { AppDataSource } from '../database/data-source.js';
import { EmployeeEntity } from '../models/entities/employee.entity.js';
import fs from 'fs';
import path from 'path';

// ============================================================================
// KEYWORD → TABLE RELEVANCE MAP
// Maps Vietnamese/English keywords to the tables needed to answer the question.
// Always ensure 'employees' and 'departments' are included as base JOIN tables.
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

// BASE TABLES are always included — they're needed for JOINs
const BASE_TABLES = ['employees', 'departments'];

// ============================================================================
// SCHEMA PARSER — reads databsedescription.txt and parses CREATE TABLE blocks
// ============================================================================
function parseSchemaFile() {
  const schemaFilePath = path.resolve(__dirname, '../../databsedescription.txt');
  if (!fs.existsSync(schemaFilePath)) {
    console.warn('[AiService] databsedescription.txt not found, falling back to empty schema.');
    return {};
  }

  const content = fs.readFileSync(schemaFilePath, 'utf-8');
  const tableDict = {};

  // Split by CREATE TABLE blocks
  const tableRegex = /CREATE TABLE `([^`]+)` \(([\s\S]*?)\) ENGINE=/g;
  let match;
  while ((match = tableRegex.exec(content)) !== null) {
    const tableName = match[1];
    const columnBlock = match[2];

    // Extract only column definitions (lines starting with backtick)
    const columns = columnBlock
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('`') && !line.startsWith('`id`') === false || line.startsWith('`'))
      .filter(line => !line.startsWith('PRIMARY') && !line.startsWith('KEY') && !line.startsWith('CONSTRAINT') && !line.startsWith('UNIQUE'))
      .map(line => {
        // Extract column name and type
        const colMatch = line.match(/`([^`]+)`\s+(\w+(?:\(\d+(?:,\d+)?\))?)/);
        if (colMatch) return `  ${colMatch[1]} (${colMatch[2]})`;
        return null;
      })
      .filter(Boolean)
      .slice(0, 15); // Cap at 15 columns per table to save tokens

    if (columns.length > 0) {
      tableDict[tableName] = `Table \`${tableName}\`:\n${columns.join('\n')}`;
    }
  }

  console.log(`[AiService] Schema parsed: ${Object.keys(tableDict).length} tables loaded from databsedescription.txt`);
  return tableDict;
}

// ============================================================================
// RELEVANCE ENGINE — finds which tables are needed for a given question
// ============================================================================
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
    // Parse schema ONCE at startup and cache it
    this.schemaDict = parseSchemaFile();
  }

  async getEmployeeInfo(userId) {
    const employeeRepo = AppDataSource.getRepository(EmployeeEntity);
    return await employeeRepo.findOne({
      where: { userId, isDeleted: false },
      relations: ['department'],
    });
  }

  /**
   * Returns a minimal schema string containing only the tables relevant to the question.
   * This is the core optimization — instead of ~3000 tokens, we send ~150-300 tokens.
   */
  getRelevantSchema(question) {
    const relevantTableNames = getRelevantTables(question);
    const parts = [];

    for (const tableName of relevantTableNames) {
      if (this.schemaDict[tableName]) {
        parts.push(this.schemaDict[tableName]);
      }
    }

    if (parts.length === 0) {
      // Fallback: return a list of all table names so AI at least knows what exists
      return `Các bảng trong hệ thống: ${Object.keys(this.schemaDict).join(', ')}`;
    }

    return parts.join('\n\n');
  }

  async handleChat(userId, roles, messages) {
    const employee = await this.getEmployeeInfo(userId);
    if (!employee) {
      throw new Error('Employee not found for the given user.');
    }

    // Get the relevant schema for THIS specific question (token optimization)
    const lastMessage = messages[messages.length - 1];
    const schemaText = this.getRelevantSchema(lastMessage.content);

    // Text-to-SQL Tool
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

    const historyMessages = messages.slice(0, -1);
    let historyData = historyMessages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    // Gemini API requires the first message in the history to be 'user'
    while (historyData.length > 0 && historyData[0].role === 'model') {
      historyData.shift();
    }

    const chatSession = model.startChat({ history: historyData });

    let result;
    try {
      result = await chatSession.sendMessage(lastMessage.content);
    } catch (err) {
      console.error('Lỗi gửi message:', err);
      throw err;
    }

    let finalResponseText = result.response.text();
    let functionCalls = result.response.functionCalls();

    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      const toolResult = await this.executeTool(call);

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

    return {
      content: finalResponseText,
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
