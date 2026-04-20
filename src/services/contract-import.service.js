import { GoogleGenerativeAI } from '@google/generative-ai';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import path from 'path';
import { AppDataSource } from '../database/data-source.js';
import { EmployeeEntity } from '../models/entities/employee.entity.js';
import { DepartmentEntity } from '../models/entities/department.entity.js';
import { PositionEntity } from '../models/entities/position.entity.js';
import { JobGradeEntity } from '../models/entities/job-grade.entity.js';
import { AiConfigurationEntity } from '../models/entities/ai-configuration.entity.js';

const CONTRACT_TYPE_MAP = [
  { value: 'probation', keywords: ['thu viec', 'thử việc', 'probation'] },
  {
    value: 'internship',
    keywords: ['hoc viec', 'học việc', 'internship', 'thuc tap', 'thực tập'],
  },
  {
    value: 'permanent',
    keywords: [
      'khong thoi han',
      'không thời hạn',
      'permanent',
      'vo thoi han',
      'vô thời hạn',
      'khong xac dinh thoi han',
      'không xác định thời hạn',
    ],
  },
  {
    value: 'fixed_term',
    keywords: [
      'co thoi han',
      'có thời hạn',
      'fixed_term',
      'xác định thời hạn',
      'hop dong co thoi han',
      'hợp đồng có thời hạn',
    ],
  },
];

function stripJsonFence(text) {
  if (!text) return '';
  return String(text)
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
}

function toNumber(value) {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value === 'number') return Number.isFinite(value) ? value : '';
  const normalized = String(value)
    .replace(/\s/g, '')
    .replace(/[^\d,-]/g, '')
    .replace(/,/g, '');
  if (!normalized) return '';
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? '' : parsed;
}

function padDatePart(part) {
  return String(part || '').padStart(2, '0');
}

function toIsoDate(value) {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().split('T')[0];
  }

  const raw = String(value).trim();
  const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    return `${isoMatch[1]}-${padDatePart(isoMatch[2])}-${padDatePart(
      isoMatch[3],
    )}`;
  }

  const slashMatch = raw.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
  if (slashMatch) {
    return `${slashMatch[3]}-${padDatePart(slashMatch[2])}-${padDatePart(
      slashMatch[1],
    )}`;
  }

  const date = new Date(raw);
  if (!Number.isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  return '';
}

function normalizeContractType(value, fallbackText = '') {
  const combined = `${value || ''} ${fallbackText || ''}`.toLowerCase();
  for (const item of CONTRACT_TYPE_MAP) {
    if (item.keywords.some((keyword) => combined.includes(keyword))) {
      return item.value;
    }
  }
  if (['probation', 'internship', 'fixed_term', 'permanent'].includes(value)) {
    return value;
  }
  return 'fixed_term';
}

function extractLabelValue(text, labels, maxChars = 120) {
  if (!text) return '';

  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(
      `${escaped}\\s*[:\\-]?\\s*([^\\n\\r]{1,${maxChars}})`,
      'i',
    );
    const match = text.match(regex);
    if (match && match[1]) {
      return String(match[1]).trim();
    }
  }

  return '';
}

function extractLabelDate(text, labels) {
  const raw = extractLabelValue(text, labels, 40);
  if (!raw) return '';
  const dateLike = raw.match(
    /(\d{1,2}[/.-]\d{1,2}[/.-]\d{4}|\d{4}-\d{1,2}-\d{1,2})/,
  );
  return toIsoDate(dateLike ? dateLike[1] : raw);
}

function extractLabelNumber(text, labels) {
  const raw = extractLabelValue(text, labels, 60);
  return toNumber(raw);
}

function toDecimalNumber(value) {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : '';
  }

  const match = String(value)
    .replace(/,/g, '.')
    .match(/-?\d+(?:\.\d+)?/);
  if (!match) return '';

  const parsed = Number(match[0]);
  return Number.isNaN(parsed) ? '' : parsed;
}

function parseWorkingHours(value) {
  if (value === undefined || value === null || value === '') return '';
  if (typeof value === 'number') return Number.isFinite(value) ? value : '';

  const text = String(value).trim().toLowerCase();
  if (!text) return '';

  const weekHoursMatch = text.match(
    /(-?\d+(?:[.,]\d+)?)\s*(?:gi(?:ờ|o)?|hours?)?\s*(?:\/\s*(?:tuần|week)|\b(?:tuần|week)\b)/i,
  );
  const weekHours = toDecimalNumber(weekHoursMatch?.[1]);
  if (weekHours !== '') return weekHours;

  const hoursPerDayMatch = text.match(
    /(-?\d+(?:[.,]\d+)?)\s*(?:gi(?:ờ|o)?|hours?)?\s*(?:\/\s*(?:ngày|day)|\b(?:ngày|day)\b)/i,
  );
  const daysPerWeekMatch = text.match(
    /(-?\d+(?:[.,]\d+)?)\s*(?:ngày|days?)\s*(?:\/\s*(?:tuần|week)|\b(?:tuần|week)\b)/i,
  );

  const hoursPerDay = toDecimalNumber(hoursPerDayMatch?.[1]);
  const daysPerWeek = toDecimalNumber(daysPerWeekMatch?.[1]);

  if (hoursPerDay !== '' && daysPerWeek !== '') {
    return Number((hoursPerDay * daysPerWeek).toFixed(2));
  }

  return toNumber(value);
}

async function findBestLikeMatch(repository, fieldName, value) {
  if (!value) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;

  const exact = await repository.findOne({
    where: {
      [fieldName]: normalized,
      isDeleted: false,
    },
  });
  if (exact) return exact;

  return repository
    .createQueryBuilder('item')
    .where('item.isDeleted = :isDeleted', { isDeleted: false })
    .andWhere(`LOWER(item.${fieldName}) LIKE :value`, {
      value: `%${normalized.toLowerCase()}%`,
    })
    .orderBy(`item.${fieldName}`, 'ASC')
    .getOne();
}

export class ContractImportService {
  constructor() {
    this.activeConfigCache = null;
  }

  async getActiveModel() {
    if (this.activeConfigCache) {
      return this.activeConfigCache;
    }

    const repo = AppDataSource.getRepository(AiConfigurationEntity);
    const activeConfig = await repo.findOne({ where: { status: 'ACTIVE' } });
    if (!activeConfig || !activeConfig.configValue) {
      return null;
    }

    this.activeConfigCache = activeConfig;
    return activeConfig;
  }

  async extractSourceText(file) {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const mimeType = file.mimetype || '';

    if (mimeType.startsWith('image/')) {
      return { kind: 'image', text: '', mimeType, ext };
    }

    if (mimeType === 'application/pdf' || ext === '.pdf') {
      const pdfResult = await pdfParse(file.buffer);
      return {
        kind: 'text',
        text: pdfResult.text || '',
        mimeType: 'application/pdf',
        ext,
      };
    }

    if (
      mimeType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      ext === '.docx'
    ) {
      const docxResult = await mammoth.extractRawText({ buffer: file.buffer });
      return {
        kind: 'text',
        text: docxResult.value || '',
        mimeType,
        ext,
      };
    }

    if (mimeType === 'text/plain' || ext === '.txt') {
      return {
        kind: 'text',
        text: file.buffer.toString('utf-8'),
        mimeType: 'text/plain',
        ext,
      };
    }

    if (mimeType === 'application/msword' || ext === '.doc') {
      const rawBinary = file.buffer.toString('latin1');
      const printableChunks = rawBinary.match(/[\x20-\x7EÀ-ỹ]{4,}/g) || [];
      return {
        kind: 'text',
        text: printableChunks.join(' '),
        mimeType: 'application/msword',
        ext,
      };
    }

    throw new Error('Định dạng tệp không được hỗ trợ.');
  }

  async extractWithAi(file, sourceText) {
    const activeConfig = await this.getActiveModel();
    if (!activeConfig) {
      throw new Error(
        'Cấu hình AI chưa được thiết lập, vui lòng báo quản trị viên.',
      );
    }

    const genAI = new GoogleGenerativeAI(activeConfig.configValue);
    const model = genAI.getGenerativeModel({
      model: activeConfig.aiModel || 'gemini-2.5-flash',
    });

    const prompt = `Bạn là hệ thống trích xuất dữ liệu hợp đồng lao động. Hãy đọc file đầu vào và trả về CHỈ JSON hợp lệ, không markdown, không giải thích.

Mục tiêu: lấy dữ liệu để đổ vào form tạo hợp đồng và cho người dùng kiểm tra lại.

Trường cần cố gắng trích xuất:
- employeeName
- employeeCode
- contractNumber
- contractType (probation | internship | fixed_term | permanent)
- signedDate (YYYY-MM-DD)
- startDate (YYYY-MM-DD)
- endDate (YYYY-MM-DD, nếu có)
- workingHours
- departmentName
- positionName
- jobGradeName
- baseSalary
- performanceSalary
- lunchAllowance
- fuelAllowance
- phoneAllowance
- otherAllowance
- note

Quy tắc:
- Nếu không chắc chắn giá trị nào, để trống "".
- Số tiền chỉ trả về số nguyên.
- Ngày phải chuẩn hóa về YYYY-MM-DD.
- contractType nên chuẩn hóa theo 4 giá trị hệ thống.
- workingHours trả về tổng số giờ làm việc trong tuần. Ví dụ "8 giờ/ngày, 5 ngày/tuần" -> 40.

Nếu chỉ có văn bản thô, hãy suy luận từ văn bản đó.
${sourceText ? `\nNội dung trích xuất:\n${sourceText}` : ''}`;

    let resultText = '';
    if (file.mimetype.startsWith('image/')) {
      const result = await model.generateContent([
        { text: prompt },
        {
          inlineData: {
            mimeType: file.mimetype,
            data: file.buffer.toString('base64'),
          },
        },
      ]);
      resultText = result.response.text();
    } else {
      const result = await model.generateContent(prompt);
      resultText = result.response.text();
    }

    const cleaned = stripJsonFence(resultText);
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    const payload = JSON.parse(jsonMatch ? jsonMatch[0] : cleaned);
    return payload;
  }

  async extractWithFallback(sourceText) {
    const text = String(sourceText || '');
    const lowerText = text.toLowerCase();

    const contractNumberByLabel = extractLabelValue(text, [
      'Số hợp đồng',
      'Mã hợp đồng',
      'Contract Number',
      'Contract No',
    ]);
    const contractNumberMatch = text.match(
      /(?:số\s*hợp\s*đồng|mã\s*hợp\s*đồng|contract\s*number)[:\s-]*([A-Z0-9/_.-]{3,})/i,
    );

    const signedDateByLabel = extractLabelDate(text, [
      'Ngày ký',
      'Ngày ký kết',
      'Signed Date',
      'Signing Date',
    ]);
    const startDateByLabel = extractLabelDate(text, [
      'Ngày bắt đầu',
      'Ngày hiệu lực',
      'Start Date',
      'Effective Date',
    ]);
    const endDateByLabel = extractLabelDate(text, [
      'Ngày kết thúc',
      'Thời hạn đến',
      'End Date',
      'Expire Date',
    ]);

    const dateMatches = [
      ...text.matchAll(
        /(\d{1,2}[/.-]\d{1,2}[/.-]\d{4}|\d{4}-\d{1,2}-\d{1,2})/g,
      ),
    ].map((match) => toIsoDate(match[1]));

    const baseSalaryByLabel = extractLabelNumber(text, [
      'Lương cơ bản',
      'Mức lương cơ bản',
      'Base Salary',
    ]);
    const performanceSalaryByLabel = extractLabelNumber(text, [
      'Lương KPI',
      'Lương hiệu quả',
      'Performance Salary',
      'KPI Salary',
    ]);
    const lunchAllowanceByLabel = extractLabelNumber(text, [
      'Phụ cấp ăn trưa',
      'Lunch Allowance',
    ]);
    const fuelAllowanceByLabel = extractLabelNumber(text, [
      'Phụ cấp xăng xe',
      'Fuel Allowance',
    ]);
    const phoneAllowanceByLabel = extractLabelNumber(text, [
      'Phụ cấp điện thoại',
      'Phone Allowance',
    ]);
    const otherAllowanceByLabel = extractLabelNumber(text, [
      'Phụ cấp khác',
      'Other Allowance',
    ]);

    const workingHoursByLabel = parseWorkingHours(
      extractLabelValue(text, [
        'Thời giờ làm việc',
        'Giờ làm việc',
        'Working Hours',
      ]),
    );

    const employeeNameByLabel = extractLabelValue(text, [
      'Họ và tên',
      'Họ tên',
      'Nhân viên',
      'Employee Name',
      'Employee',
    ]);
    const employeeCodeByLabel = extractLabelValue(text, [
      'Mã nhân viên',
      'Employee Code',
      'Staff Code',
    ]);
    const departmentNameByLabel = extractLabelValue(text, [
      'Phòng ban',
      'Department',
    ]);
    const positionNameByLabel = extractLabelValue(text, [
      'Vị trí',
      'Chức danh',
      'Position',
      'Title',
    ]);
    const jobGradeNameByLabel = extractLabelValue(text, [
      'Ngạch lương',
      'Bậc lương',
      'Job Grade',
      'Grade',
    ]);
    const noteByLabel = extractLabelValue(text, ['Ghi chú', 'Note'], 300);

    const salaryMatches = [
      ...text.matchAll(/([\d.,]{4,})\s*(?:vnđ|vnd|đ)?/gi),
    ].map((match) => toNumber(match[1]));

    return {
      employeeName: employeeNameByLabel || '',
      employeeCode: employeeCodeByLabel || '',
      contractNumber: contractNumberByLabel || contractNumberMatch?.[1] || '',
      contractType: normalizeContractType('', lowerText),
      signedDate: signedDateByLabel || dateMatches[0] || '',
      startDate: startDateByLabel || dateMatches[1] || '',
      endDate: endDateByLabel || dateMatches[2] || '',
      workingHours: workingHoursByLabel || '',
      departmentName: departmentNameByLabel || '',
      positionName: positionNameByLabel || '',
      jobGradeName: jobGradeNameByLabel || '',
      baseSalary: baseSalaryByLabel || salaryMatches[0] || '',
      performanceSalary: performanceSalaryByLabel || salaryMatches[1] || '',
      lunchAllowance: lunchAllowanceByLabel || salaryMatches[2] || '',
      fuelAllowance: fuelAllowanceByLabel || salaryMatches[3] || '',
      phoneAllowance: phoneAllowanceByLabel || salaryMatches[4] || '',
      otherAllowance: otherAllowanceByLabel || salaryMatches[5] || '',
      note: noteByLabel || '',
    };
  }

  async resolveRelatedEntities(extracted) {
    const employeeRepo = AppDataSource.getRepository(EmployeeEntity);
    const departmentRepo = AppDataSource.getRepository(DepartmentEntity);
    const positionRepo = AppDataSource.getRepository(PositionEntity);
    const jobGradeRepo = AppDataSource.getRepository(JobGradeEntity);

    let employee = null;
    const employeeCode = String(extracted.employeeCode || '').trim();
    const employeeName = String(extracted.employeeName || '').trim();

    if (employeeCode) {
      employee = await employeeRepo.findOne({
        where: { employeeCode, isDeleted: false },
        relations: ['department', 'position', 'jobGrade'],
      });
    }

    if (!employee && employeeName) {
      employee = await employeeRepo
        .createQueryBuilder('employee')
        .leftJoinAndSelect('employee.department', 'department')
        .leftJoinAndSelect('employee.position', 'position')
        .leftJoinAndSelect('employee.jobGrade', 'jobGrade')
        .where('employee.isDeleted = :isDeleted', { isDeleted: false })
        .andWhere('LOWER(employee.fullName) LIKE :employeeName', {
          employeeName: `%${employeeName.toLowerCase()}%`,
        })
        .orderBy('employee.fullName', 'ASC')
        .getOne();
    }

    const department = await findBestLikeMatch(
      departmentRepo,
      'departmentName',
      extracted.departmentName,
    );
    const position = await findBestLikeMatch(
      positionRepo,
      'positionName',
      extracted.positionName,
    );
    const jobGrade = await findBestLikeMatch(
      jobGradeRepo,
      'gradeName',
      extracted.jobGradeName,
    );

    return {
      employee,
      department,
      position,
      jobGrade,
    };
  }

  async importFromFile(file) {
    if (!file) {
      throw new Error('Vui lòng chọn tệp hợp đồng để import.');
    }

    const source = await this.extractSourceText(file);
    const plainText = source.kind === 'text' ? source.text : '';

    let extracted;
    try {
      extracted = await this.extractWithAi(
        file,
        plainText ? plainText.slice(0, 40000) : '',
      );
    } catch (error) {
      if (source.kind === 'image') {
        throw error;
      }

      extracted = await this.extractWithFallback(plainText);
    }

    const resolved = await this.resolveRelatedEntities(extracted);

    const normalized = {
      employeeId: resolved.employee?.id || '',
      employeeName: extracted.employeeName || resolved.employee?.fullName || '',
      employeeCode:
        extracted.employeeCode || resolved.employee?.employeeCode || '',
      contractNumber: extracted.contractNumber || '',
      contractType: normalizeContractType(extracted.contractType, plainText),
      signedDate: toIsoDate(extracted.signedDate),
      startDate: toIsoDate(extracted.startDate),
      endDate: toIsoDate(extracted.endDate),
      workingHours: parseWorkingHours(extracted.workingHours) || '',
      departmentId: resolved.department?.id || '',
      positionId: resolved.position?.id || resolved.employee?.positionId || '',
      jobGradeId: resolved.jobGrade?.id || resolved.employee?.jobGradeId || '',
      departmentName:
        extracted.departmentName || resolved.department?.departmentName || '',
      positionName:
        extracted.positionName || resolved.position?.positionName || '',
      jobGradeName:
        extracted.jobGradeName || resolved.jobGrade?.gradeName || '',
      baseSalary: toNumber(extracted.baseSalary) || '',
      performanceSalary: toNumber(extracted.performanceSalary) || '',
      lunchAllowance: toNumber(extracted.lunchAllowance) || '',
      fuelAllowance: toNumber(extracted.fuelAllowance) || '',
      phoneAllowance: toNumber(extracted.phoneAllowance) || '',
      otherAllowance: toNumber(extracted.otherAllowance) || '',
      note: extracted.note || '',
      sourceFileName: file.originalname || '',
      sourceMimeType: file.mimetype || '',
      warnings: [],
    };

    if (!normalized.employeeId && normalized.employeeName) {
      normalized.warnings.push(
        'Không tìm thấy nhân viên khớp hoàn toàn, vui lòng kiểm tra lại.',
      );
    }
    if (!normalized.departmentId && normalized.departmentName) {
      normalized.warnings.push(
        'Không tìm thấy phòng ban khớp hoàn toàn, vui lòng kiểm tra lại.',
      );
    }
    if (!normalized.positionId && normalized.positionName) {
      normalized.warnings.push(
        'Không tìm thấy vị trí khớp hoàn toàn, vui lòng kiểm tra lại.',
      );
    }
    if (!normalized.jobGradeId && normalized.jobGradeName) {
      normalized.warnings.push(
        'Không tìm thấy ngạch lương khớp hoàn toàn, vui lòng kiểm tra lại.',
      );
    }

    return normalized;
  }
}
