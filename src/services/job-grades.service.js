import { JobGradesRepository } from '../repositories/job-grades.repository.js';
import {
  NotFoundException,
  ConflictException,
} from '../common/exceptions/index.js';
import { PaginatedResponseDto } from '../common/dto/index.js';
import { ExcelUtil } from '../common/utils/excel.util.js';

export class JobGradesService {
  constructor() {
    this.jobGradesRepository = new JobGradesRepository();
  }

  async create(createDto) {
    const existing = await this.jobGradesRepository.findByName(
      createDto.gradeName,
    );
    if (existing) {
      throw new ConflictException('Job grade already exists');
    }
    return this.jobGradesRepository.create(createDto);
  }

  async findAll(queryDto) {
    const [jobGrades, total] = await this.jobGradesRepository.findAll(queryDto);
    return new PaginatedResponseDto(jobGrades, total, queryDto);
  }

  async findById(id) {
    const jobGrade = await this.jobGradesRepository.findById(id);
    if (!jobGrade) {
      throw new NotFoundException('Job grade not found');
    }
    return jobGrade;
  }

  async update(id, updateDto) {
    await this.findById(id);

    if (updateDto.gradeName) {
      const existing = await this.jobGradesRepository.findByName(
        updateDto.gradeName,
      );
      if (existing && existing.id !== id) {
        throw new ConflictException('Job grade already exists');
      }
    }

    return this.jobGradesRepository.update(id, updateDto);
  }

  async remove(id) {
    await this.findById(id);
    await this.jobGradesRepository.delete(id);
  }

  async exportExcel() {
    const [jobGrades] = await this.jobGradesRepository.findAll({
      limit: 10000,
      page: 1,
    });

    const data = jobGrades.map((jg, index) => ({
      index: index + 1,
      gradeName: jg.gradeName,
      minSalary: jg.minSalary,
      maxSalary: jg.maxSalary,
    }));

    const columns = [
      { header: 'STT', key: 'index', width: 10 },
      { header: 'Tên cấp bậc', key: 'gradeName', width: 30 },
      { header: 'Lương tối thiểu', key: 'minSalary', width: 20 },
      { header: 'Lương tối đa', key: 'maxSalary', width: 20 },
    ];

    return ExcelUtil.export(data, columns, 'Danh sách cấp bậc công việc');
  }

  async findList() {
    return this.jobGradesRepository.findList();
  }
}
