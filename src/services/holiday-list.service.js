import { PaginatedResponseDto } from '../common/dto/index.js';
import { BadRequestException, NotFoundException } from '../common/exceptions/index.js';
import { ExcelUtil } from '../common/utils/excel.util.js';
import { HolidayListRepository } from '../repositories/holiday-list.repository.js';

export class HolidayListService {
    constructor() {
        this.repository = new HolidayListRepository();
    }

    async findAll(queryDto) {
        const [items, total] = await this.repository.findAll(queryDto);
        return new PaginatedResponseDto(items, total, queryDto);
    }

    async findById(id) {
        const holiday = await this.repository.findById(id);
        if (!holiday) {
            throw new NotFoundException('Holiday not found');
        }
        return holiday;
    }

    async create(data) {
        // Validate date format or uniqueness if needed
        const existing = await this.repository.findByNameAndDate(data.holidayName, data.holidayDate);
        if (existing) {
            throw new BadRequestException('Holiday already exists for this date');
        }
        return this.repository.create(data);
    }

    async update(id, data) {
        const holiday = await this.findById(id);
        return this.repository.update(holiday.id, data);
    }

    async delete(id) {
        const holiday = await this.findById(id);
        await this.repository.delete(holiday.id);
        return { message: 'Holiday deleted successfully' };
    }

    async export(queryDto) {
        const [items] = await this.repository.findAll({ ...queryDto, limit: 10000, skip: 0 });

        const data = items.map((item, index) => ({
            index: index + 1,
            holidayName: item.holidayName,
            holidayDate: item.holidayDate,
            description: item.description || '',
        }));

        const columns = [
            { header: 'STT', key: 'index', width: 8 },
            { header: 'Tên ngày lễ', key: 'holidayName', width: 30 },
            { header: 'Ngày', key: 'holidayDate', width: 20 },
            { header: 'Mô tả', key: 'description', width: 40 },
        ];

        return ExcelUtil.export(data, columns, 'Danh sach ngay le');
    }
}
