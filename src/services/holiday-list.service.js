import { PaginatedResponseDto } from '../common/dto/index.js';
import { BadRequestException, NotFoundException } from '../common/exceptions/index.js';
import { ExcelUtil } from '../common/utils/excel.util.js';
import { EmployeesRepository } from '../repositories/employees.repository.js';
import { HolidayListRepository } from '../repositories/holiday-list.repository.js';
import { HolidayConfigRepository } from '../repositories/holiday-configs.repository.js';
import { mailService } from './mail.service.js';
import { NotificationsService } from './notifications.service.js';

export class HolidayListService {
    constructor() {
        this.repository = new HolidayListRepository();
        this.employeesRepository = new EmployeesRepository();
        this.configRepository = new HolidayConfigRepository();
        this.notificationsService = new NotificationsService();
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

    _validateCompensatoryDays(compensatoryDays) {
        if (!compensatoryDays || !Array.isArray(compensatoryDays)) return;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i < compensatoryDays.length; i++) {
            const cd = compensatoryDays[i];
            if (!cd.date) {
                throw new BadRequestException(`Vui lòng chọn ngày làm bù cho dòng thứ ${i + 1}`);
            }

            const compDate = new Date(cd.date + "T00:00:00");
            if (isNaN(compDate.getTime()) || compDate < today) {
                throw new BadRequestException(`Tại ngày làm bù thứ ${i + 1}: Ngày làm bù không được chọn trong quá khứ hoặc không hợp lệ.`);
            }

            const dayOfWeek = compDate.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                throw new BadRequestException(`Tại ngày làm bù thứ ${i + 1}: Ngày làm bù phải là ngày không có phân ca (Thứ 7 hoặc Chủ Nhật).`);
            }
        }
    }

    async create(data) {
        if (new Date(data.startDate) > new Date(data.endDate)) {
            throw new BadRequestException('Ngày kết thúc không được trước ngày bắt đầu');
        }
        
        this._validateCompensatoryDays(data.compensatoryDays);

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

        this._validateCompensatoryDays(data.compensatoryDays);

        const holiday = await this.findById(id);
        return this.repository.update(holiday.id, {
            ...data,
            updatedBy: data.updatedBy || 'System'
        });
    }

    async delete(id) {
        const holiday = await this.findById(id);
        
        // Extract month and year
        const startDate = new Date(holiday.startDate);
        const month = startDate.getMonth() + 1;
        const year = startDate.getFullYear();

        // Check Payroll Dependency
        const payrollRepo = new (await import('../repositories/payroll.repository.js')).PayrollRepository();
        const lockedPayroll = await payrollRepo.repository.findOne({
            where: [
                { payrollMonth: month, payrollYear: year, payrollStatus: 'LOCKED', isDeleted: false },
                { payrollMonth: month, payrollYear: year, payrollStatus: 'APPROVED', isDeleted: false }
            ]
        });

        if (lockedPayroll) {
            throw new BadRequestException(`Không thể xóa ngày nghỉ lễ vì bảng lương tháng ${month}/${year} đã được phê duyệt hoặc chốt.`);
        }

        // Check TimeSheet Dependency
        const timeSheetRepo = new (await import('../repositories/time-sheet.repository.js')).TimeSheetRepository();
        const lockedTimeSheet = await timeSheetRepo.repository.findOne({
            where: { month: month, year: year, isLocked: true, isDeleted: false }
        });

        if (lockedTimeSheet) {
            throw new BadRequestException(`Không thể xóa ngày nghỉ lễ vì bảng công tháng ${month}/${year} đã bị chốt.`);
        }

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

    async processScheduledReminders() {
        console.log('[HolidayReminder] Starting automated reminder process...');
        
        const config = await this.configRepository.getConfig();
        if (!config.remindersEnabled) {
            console.log('[HolidayReminder] Reminders are disabled by configuration.');
            return;
        }

        const leadTime = config.reminderLeadTime || 0;
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + leadTime);
        const dateString = targetDate.toISOString().split('T')[0];

        console.log(`[HolidayReminder] Checking for holidays on ${dateString} (Lead time: ${leadTime} days)`);

        const holidays = await this.repository.findByStartDate(dateString);
        if (holidays.length === 0) {
            console.log('[HolidayReminder] No upcoming holidays found for reminder.');
            return;
        }

        const recipients = await this.employeesRepository.findByRoleNames(config.reminderRecipients || []);
        if (recipients.length === 0) {
            console.log('[HolidayReminder] No recipients found for the configured roles.');
            return;
        }

        const stats = {
            holidaysProcessed: holidays.length,
            recipientsTargeted: recipients.length,
            channels: config.reminderChannels || [],
            outcomes: []
        };

        for (const holiday of holidays) {
            // Check if holiday type is in filter
            if (config.reminderHolidayTypes && config.reminderHolidayTypes.length > 0) {
                if (!config.reminderHolidayTypes.includes(holiday.holidayType)) {
                    console.log(`[HolidayReminder] Skipping holiday "${holiday.holidayName}" as type "${holiday.holidayType}" is not in filter.`);
                    continue;
                }
            }

            const subject = `Nhắc nhở ngày nghỉ lễ sắp tới: ${holiday.holidayName}`;
            const startDate = new Date(holiday.startDate).toLocaleDateString('vi-VN');
            const endDate = new Date(holiday.endDate).toLocaleDateString('vi-VN');

            const content = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                    <h2 style="color: #4f46e5; text-align: center;">Nhắc nhở Nghỉ lễ</h2>
                    <p>Kính gửi anh/chị,</p>
                    <p>Hệ thống xin nhắc nhở về ngày nghỉ lễ <strong>${holiday.holidayName}</strong> sắp tới:</p>
                    <div style="background-color: #f9fafb; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Ngày bắt đầu:</strong> ${startDate}</p>
                        <p style="margin: 5px 0;"><strong>Ngày kết thúc:</strong> ${endDate}</p>
                        ${holiday.description ? `<p style="margin: 5px 0;"><strong>Ghi chú:</strong> ${holiday.description}</p>` : ''}
                    </div>
                    ${config.holidayReminderPolicy ? `<p><strong>Lưu ý:</strong> ${config.holidayReminderPolicy}</p>` : ''}
                    <p>Chúc quý anh/chị một kỳ nghỉ lễ vui vẻ!</p>
                </div>
            `;

            // Send via IN_APP if enabled
            if (config.reminderChannels?.includes('IN_APP')) {
                await this.notificationsService.createNotification({
                    title: subject,
                    message: holiday.description || `Chào mừng kỳ nghỉ ${holiday.holidayName}`,
                    notificationType: 'HOLIDAY_REMINDER',
                    recipientIds: recipients.map(emp => emp.userId).filter(Boolean)
                });
            }

            // Send via EMAIL if enabled
            if (config.reminderChannels?.includes('EMAIL')) {
                await Promise.all(
                    recipients.map(async (emp) => {
                        const email = emp.companyEmail || emp.user?.email;
                        if (email) {
                            return mailService.sendHolidayNotification(email, subject, content);
                        }
                    })
                );
            }

            stats.outcomes.push({ holiday: holiday.holidayName, status: 'Sent' });
        }

        console.log('[HolidayReminder] Automated reminder process completed.', stats);
        return stats;
    }
}
