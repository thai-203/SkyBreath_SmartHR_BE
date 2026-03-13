import { PaginatedResponseDto } from '../common/dto/index.js';
import { BadRequestException, NotFoundException } from '../common/exceptions/index.js';
import { ExcelUtil } from '../common/utils/excel.util.js';
import { EmployeesRepository } from '../repositories/employees.repository.js';
import { HolidayListRepository } from '../repositories/holiday-list.repository.js';
import { mailService } from './mail.service.js';

export class HolidayListService {
    constructor() {
        this.repository = new HolidayListRepository();
        this.employeesRepository = new EmployeesRepository();
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
        if (new Date(data.startDate) > new Date(data.endDate)) {
            throw new BadRequestException('Ngày kết thúc không được trước ngày bắt đầu');
        }
        // Validate date format or uniqueness if needed
        const existing = await this.repository.findByNameAndRange(data.holidayName, data.startDate, data.endDate);
        if (existing) {
            throw new BadRequestException('Ngày lễ đã tồn tại trong khoảng thời gian này');
        }
        return this.repository.create({
            ...data,
            updatedBy: data.updatedBy || 'System'
        });
    }

    async update(id, data) {
        if (data.startDate && data.endDate && new Date(data.startDate) > new Date(data.endDate)) {
            throw new BadRequestException('Ngày kết thúc không được trước ngày bắt đầu');
        }
        const holiday = await this.findById(id);
        return this.repository.update(holiday.id, {
            ...data,
            updatedBy: data.updatedBy || 'System'
        });
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
            startDate: item.startDate,
            endDate: item.endDate,
            holidayType: item.holidayType || '',
            isPaid: item.isPaid ? 'Yes' : 'No',
            updatedBy: item.updatedBy || '',
            updatedAt: item.updatedAt,
        }));

        const columns = [
            { header: 'STT', key: 'index', width: 8 },
            { header: 'Tên ngày lễ', key: 'holidayName', width: 30 },
            { header: 'Ngày bắt đầu', key: 'startDate', width: 15 },
            { header: 'Ngày kết thúc', key: 'endDate', width: 15 },
            { header: 'Loại ngày', key: 'holidayType', width: 20 },
            { header: 'Tính công', key: 'isPaid', width: 10 },
            { header: 'Người cập nhật', key: 'updatedBy', width: 20 },
            { header: 'Ngày cập nhật', key: 'updatedAt', width: 20 },
        ];

        return ExcelUtil.export(data, columns, 'Danh sach ngay le');
    }

    async getInheritPreview(year) {
        // Find all holidays in the target year
        const startDate = `${year}-01-01`;
        const endDate = `${year}-12-31`;

        const [items] = await this.repository.findAll({
            startDate,
            endDate,
            limit: 1000,
            skip: 0
        });

        // Shift them to the next year
        return items.map(item => {
            const start = new Date(item.startDate);
            const end = new Date(item.endDate);

            start.setFullYear(start.getFullYear() + 1);
            end.setFullYear(end.getFullYear() + 1);

            return {
                holidayName: item.holidayName,
                startDate: start.toISOString().split('T')[0],
                endDate: end.toISOString().split('T')[0],
                holidayType: item.holidayType,
                isPaid: item.isPaid,
                description: item.description,
            };
        });
    }

    async bulkCreate(data, user = 'System') {
        const holidays = data.map(item => ({
            ...item,
            updatedBy: user
        }));
        return this.repository.createMany(holidays);
    }

    async sendNotification(data) {
        const { employeeIds, holidayId, type, scheduledAt } = data;

        const holiday = await this.findById(holidayId);
        const employees = await this.employeesRepository.findByIds(employeeIds);

        if (employees.length === 0) {
            throw new BadRequestException('No valid employees selected');
        }

        const subject = `Thông báo nghỉ lễ: ${holiday.holidayName}`;
        const startDate = new Date(holiday.startDate).toLocaleDateString('vi-VN');
        const endDate = new Date(holiday.endDate).toLocaleDateString('vi-VN');
        
        const content = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h2 style="color: #003399; text-align: center;">Thông báo nghỉ lễ</h2>
                <p>Kính gửi anh/chị,</p>
                <p>Công ty xin thông báo về kế hoạch nghỉ lễ <strong>${holiday.holidayName}</strong> như sau:</p>
                <div style="background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Thời gian bắt đầu:</strong> ${startDate}</p>
                    <p style="margin: 5px 0;"><strong>Thời gian kết thúc:</strong> ${endDate}</p>
                    <p style="margin: 5px 0;"><strong>Loại ngày nghỉ:</strong> ${holiday.holidayType}</p>
                    ${holiday.description ? `<p style="margin: 5px 0;"><strong>Ghi chú:</strong> ${holiday.description}</p>` : ''}
                </div>
                <p>Trân trọng cảm ơn!</p>
                <p style="margin-top: 30px; font-size: 12px; color: #6b7280; text-align: center;">
                    Đây là email tự động từ hệ thống SmartHR. Vui lòng không phản hồi email này.
                </p>
            </div>
        `;

        // If type is auto, we should ideally schedule it. For now, let's treat it as manual or log it.
        // Usually, you'd use a job queue like Bull or a cron job.
        if (type === 'auto') {
            console.log(`[Notification] Scheduled holiday notification for ${scheduledAt}`);
            // TODO: Implement scheduling logic if needed
        }

        const results = await Promise.all(
            employees.map(async (emp) => {
                const email = emp.companyEmail || emp.user?.email;
                if (email) {
                    return mailService.sendHolidayNotification(email, subject, content);
                }
                return false;
            })
        );

        return {
            success: true,
            message: `Sent notifications to ${employees.length} employees`,
            count: results.filter(Boolean).length
        };
    }
}
