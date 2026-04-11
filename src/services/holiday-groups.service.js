import { HolidayGroupRepository } from '../repositories/holiday-groups.repository.js';
import { BadRequestException, NotFoundException } from '../common/exceptions/index.js';

export class HolidayGroupService {
    constructor() {
        this.repository = new HolidayGroupRepository();
    }

    async create(data) {
        // Validation: Required fields (simple check, assuming DTO handled most)
        if (!data.groupName || !data.groupCode || !data.year) {
            throw new BadRequestException('Tên, mã và năm là bắt buộc');
        }

        // Validation: Unique Code
        const existingCode = await this.repository.findByCode(data.groupCode);
        if (existingCode) {
            throw new BadRequestException(`Mã danh mục ngày lễ "${data.groupCode}" đã tồn tại`);
        }

        // Validation: Unique Active per Year/Scope
        if (data.status === 'ACTIVE') {
            const existingActive = await this.repository.findByYearAndScope(data.year, data.applicableScope || 'GLOBAL');
            if (existingActive) {
                throw new BadRequestException(`Đã có danh mục ngày lễ đang hoạt động cho năm ${data.year} và phạm vi này`);
            }
        }

        // BR-04: Unique Name per Year/Scope
        const existingName = await this.repository.findByNameYearScope(data.groupName, data.year, data.applicableScope || 'GLOBAL');
        if (existingName) {
            throw new BadRequestException(`Tên danh mục "${data.groupName}" đã tồn tại trong năm ${data.year} cho phạm vi này`);
        }

        return this.repository.create(data);
    }

    async findAll(query) {
        return this.repository.findAll(query);
    }

    async findById(id) {
        return this.repository.findById(id);
    }

    async update(id, data) {
        const group = await this.findById(id);
        if (!group) {
            throw new NotFoundException('Không tìm thấy danh mục ngày lễ');
        }

        // BR-01: Stable Code
        if (data.groupCode && data.groupCode !== group.groupCode) {
            throw new BadRequestException('Không được phép thay đổi mã danh mục ngày lễ');
        }

        if (data.status === 'ACTIVE' && (data.status !== group.status || data.year !== group.year || data.applicableScope !== group.applicableScope)) {
            const targetYear = data.year || group.year;
            const targetScope = data.applicableScope || group.applicableScope;
            const existingActive = await this.repository.findByYearAndScope(targetYear, targetScope);
            if (existingActive && existingActive.id !== id) {
                throw new BadRequestException(`Đã có danh mục ngày lễ đang hoạt động cho năm ${targetYear} và phạm vi này`);
            }
        }

        // BR-04: Unique Name per Year/Scope (if changed)
        if (data.groupName || data.year || data.applicableScope) {
            const targetName = data.groupName || group.groupName;
            const targetYear = data.year || group.year;
            const targetScope = data.applicableScope || group.applicableScope;
            if (targetName !== group.groupName || targetYear !== group.year || targetScope !== group.applicableScope) {
                const existingName = await this.repository.findByNameYearScope(targetName, targetYear, targetScope);
                if (existingName && existingName.id !== id) {
                    throw new BadRequestException(`Tên danh mục "${targetName}" đã tồn tại trong năm ${targetYear} cho phạm vi này`);
                }
            }
        }

        return this.repository.update(id, data);
    }

    async delete(id) {
        const group = await this.repository.findById(id);
        if (!group) {
            throw new NotFoundException('Không tìm thấy danh mục ngày lễ');
        }

        // BR-01: Check if list has holiday entries
        if (group.holidays && group.holidays.length > 0) {
            throw new BadRequestException('Không thể xóa danh mục đã có các ngày nghỉ lễ. Vui lòng xóa các ngày nghỉ lễ trước.');
        }

        return this.repository.delete(id);
    }

    async inheritForNextYear(id, targetYear) {
        const sourceGroup = await this.repository.findById(id);
        if (!sourceGroup) {
            throw new NotFoundException('Không tìm thấy danh mục ngày lễ gốc');
        }

        if (targetYear <= sourceGroup.year) {
            throw new BadRequestException('Năm kế thừa phải lớn hơn năm của danh mục gốc');
        }

        // Check for duplicate name/scope in target year
        const existingConflict = await this.repository.findByNameYearScope(sourceGroup.groupName, targetYear, sourceGroup.applicableScope);
        if (existingConflict) {
            throw new BadRequestException(`Danh mục "${sourceGroup.groupName}" đã tồn tại trong năm ${targetYear}`);
        }

        // Create new Group
        const newGroupData = {
            groupName: sourceGroup.groupName, // Keep name consistent
            groupCode: `${sourceGroup.groupCode}_${targetYear}`,
            year: targetYear,
            applicableScope: sourceGroup.applicableScope,
            status: 'INACTIVE', // Default to inactive for review
            description: `Kế thừa từ ${sourceGroup.groupName} (${sourceGroup.year})`
        };

        const newGroup = await this.repository.create(newGroupData);

        // Copy Holidays
        if (sourceGroup.holidays && sourceGroup.holidays.length > 0) {
            const yearDiff = targetYear - sourceGroup.year;
            
            for (const sourceHoliday of sourceGroup.holidays) {
                // Adjust dates
                const startDate = new Date(sourceHoliday.startDate);
                startDate.setFullYear(startDate.getFullYear() + yearDiff);
                
                const endDate = new Date(sourceHoliday.endDate);
                endDate.setFullYear(endDate.getFullYear() + yearDiff);

                const newHolidayData = {
                    holidayName: sourceHoliday.holidayName,
                    holidayType: sourceHoliday.holidayType,
                    isPaid: sourceHoliday.isPaid,
                    description: sourceHoliday.description,
                    startDate: startDate.toISOString().split('T')[0],
                    endDate: endDate.toISOString().split('T')[0],
                    holidayGroupId: newGroup.id,
                    employeeIds: sourceHoliday.employees?.map(e => e.id) || [],
                    // Copy and shift compensatory days
                    compensatoryDays: Array.isArray(sourceHoliday.compensatoryDays) 
                        ? sourceHoliday.compensatoryDays.map(cd => {
                            const newDate = new Date(cd.date);
                            newDate.setFullYear(newDate.getFullYear() + yearDiff);
                            
                            const newReplacesDate = cd.replacesDate ? new Date(cd.replacesDate) : null;
                            if (newReplacesDate) {
                                newReplacesDate.setFullYear(newReplacesDate.getFullYear() + yearDiff);
                            }

                            return {
                                ...cd,
                                date: newDate.toISOString().split('T')[0],
                                replacesDate: newReplacesDate ? newReplacesDate.toISOString().split('T')[0] : ""
                            };
                        })
                        : []
                };

                // Using HolidayListRepository to handle employee associations correctly
                const holidayRepo = new (await import('../repositories/holiday-list.repository.js')).HolidayListRepository();
                await holidayRepo.create(newHolidayData);
            }
        }

        return newGroup;
    }
}
