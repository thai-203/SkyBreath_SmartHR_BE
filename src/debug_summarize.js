import { AppDataSource } from './database/data-source.js';
import { OvertimeRequestDetailEntity } from './models/entities/overtime-request-detail.entity.js';
import { ProcessedAttendanceRecordEntity } from './models/entities/processed-attendance-record.entity.js';
import { EmployeeEntity } from './models/entities/employee.entity.js';
import { HolidayListEntity } from './models/entities/holiday-list.entity.js';
import { OvertimeRuleEntity } from './models/entities/overtime-rule.entity.js';
import { OvertimeRuleDepartmentEntity } from './models/entities/overtime-rule-department.entity.js';
import { Between, In, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { toYmd } from './common/utils/date.util.js';

function _countWorkingDays(year, month, holidayDates) {
    const daysInMonth = new Date(year, month, 0).getDate();
    let count = 0;
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            count++;
        }
    }
    return count;
}

async function run() {
    await AppDataSource.initialize();
    try {
        const employeeId = 18;
        const month = 4;
        const year = 2026;

        const employeeRepo = AppDataSource.getRepository(EmployeeEntity);
        const employee = await employeeRepo.findOne({
            where: { id: employeeId },
            relations: ['department'],
        });
        if (!employee) {
            console.log("Employee not found");
            return;
        }

        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);
        const holidayRepo = AppDataSource.getRepository(HolidayListEntity);
        const holidays = await holidayRepo.find({
            where: [
                {
                    startDate: Between(
                        toYmd(startDate),
                        toYmd(endDate),
                    ),
                    isDeleted: false,
                },
            ],
        });
        const holidayDates = new Set();
        const standardDays = _countWorkingDays(year, month, holidayDates);

        // 2. Get Processed Records
        const processedRepo = AppDataSource.getRepository(ProcessedAttendanceRecordEntity);
        const records = await processedRepo
            .createQueryBuilder('par')
            .leftJoinAndSelect('par.request', 'req')
            .leftJoinAndSelect('req.requestGroup', 'rg')
            .leftJoinAndSelect('par.workingShift', 'ws')
            .where(
                'MONTH(par.attendanceDate) = :m AND YEAR(par.attendanceDate) = :y',
                { m: month, y: year },
            )
            .andWhere('par.employeeId = :employeeId', { employeeId })
            .getMany();

        console.log("Processed records count:", records.length);

        // 3. Get OT Details
        const otDetailRepo = AppDataSource.getRepository(OvertimeRequestDetailEntity);
        const otDetails = await otDetailRepo
            .createQueryBuilder('otd')
            .leftJoinAndSelect('otd.request', 'req')
            .leftJoinAndSelect('req.requestGroup', 'rg')
            .leftJoinAndSelect('otd.overtimeRule', 'rule')
            .leftJoinAndSelect('rule.overtimeType', 'type')
            .where('MONTH(otd.workDate) = :m AND YEAR(otd.workDate) = :y', {
                m: month,
                y: year,
            })
            .andWhere('req.status = :s', { s: 'APPROVED' })
            .andWhere('rg.code = :groupCode', { groupCode: 'OVERTIME' })
            .andWhere('req.employeeId = :employeeId', { employeeId })
            .getMany();

        console.log("OT Details count:", otDetails.length);
        if (otDetails.length > 0) {
            console.log("OT Detail 0 workDate:", otDetails[0].workDate);
            console.log("OT Detail 0 totalHours:", otDetails[0].totalHours);
        }

        // Rules
        const ruleRepo = AppDataSource.getRepository(OvertimeRuleEntity);
        const activeRules = await ruleRepo.find({
            where: { versionStatus: 'ACTIVE', status: 'ACTIVE', isDeleted: false },
            relations: ['overtimeType'],
        });
        const ruleDeptRepo = AppDataSource.getRepository(OvertimeRuleDepartmentEntity);
        const ruleDepts = await ruleDeptRepo.find({ where: { isDeleted: false } });

        // Perform aggregation logic
        let officialDays = 0;
        let probationDays = 0;
        let businessTripDays = 0;
        let holidayDays = 0;
        let unpaidLeaveDays = 0;
        let nightShiftOfficialDays = 0;
        let nightShiftProbationDays = 0;
        let mealCount = 0;
        let waitingDays = 0;
        let annualLeaveDays = 0;
        let benefitLeaveDaysCount = 0;

        let otWeekday = 0,
            otWeekdayNight = 0,
            otWeekend = 0,
            otWeekendNight = 0,
            otHoliday = 0,
            otHolidayNight = 0;

        console.log("\n=== START AGGREGATING OT ===");
        otDetails.forEach((ot) => {
            const hours = Number(ot.totalHours) || 0;
            let typeCode = 'WEEKDAY';
            let effectiveRule = ot.overtimeRule;
            
            console.log(`Processing OT detail: workDate=${ot.workDate}, hours=${hours}, initialRule=${effectiveRule ? 'yes' : 'no'}`);
            
            if (!effectiveRule) {
                const typeId = ot.overtimeTypeId || ot.request?.overtimeTypeId;
                console.log(`  No initial rule. typeId from detail/request: ${typeId}`);
                if (typeId) {
                    const workDate = new Date(ot.workDate);
                    console.log(`  Parsed workDate: ${workDate.toISOString()}`);
                    effectiveRule = activeRules.find((r) => {
                        if (r.overtimeTypeId !== typeId) {
                            console.log(`    Rule ${r.id} mismatch typeId: ${r.overtimeTypeId} vs ${typeId}`);
                            return false;
                        }
                        const from = r.effectiveFrom ? new Date(r.effectiveFrom) : null;
                        const to = r.effectiveTo ? new Date(r.effectiveTo) : null;
                        console.log(`    Rule ${r.id} effective dates: from=${from ? from.toISOString() : 'none'}, to=${to ? to.toISOString() : 'none'}`);
                        if (from && workDate < from) return false;
                        if (to && workDate > to) return false;
                        const depts = ruleDepts
                            .filter((rd) => rd.overtimeRuleId === r.id)
                            .map((rd) => rd.departmentId);
                        console.log(`    Rule ${r.id} depts: ${JSON.stringify(depts)} vs employeeDeptId: ${employee.departmentId}`);
                        if (depts.length > 0 && !depts.includes(employee.departmentId))
                            return false;
                        return true;
                    });
                    console.log(`  Found effectiveRule: ${effectiveRule ? effectiveRule.id : 'NONE'}`);
                }
            }
            if (effectiveRule) {
                typeCode = effectiveRule.overtimeType?.code || 'WEEKDAY';
            } else {
                const typeId = ot.overtimeTypeId || ot.request?.overtimeTypeId;
                if (typeId === 2) typeCode = 'WEEKEND';
                else if (typeId === 3) typeCode = 'HOLIDAY';
                else typeCode = 'WEEKDAY';
            }
            console.log(`  Final typeCode: ${typeCode}`);

            const isNight =
                ot.startTime &&
                (ot.startTime >= '22:00:00' || ot.startTime < '06:00:00');
            console.log(`  Is night: ${isNight}`);

            if (typeCode === 'WEEKDAY') {
                if (isNight) otWeekdayNight += hours;
                else otWeekday += hours;
            } else if (typeCode === 'WEEKEND') {
                if (isNight) otWeekendNight += hours;
                else otWeekend += hours;
            } else if (typeCode === 'HOLIDAY') {
                if (isNight) otHolidayNight += hours;
                else otHoliday += hours;
            }
        });

        console.log("\n=== AGGREGATION RESULTS ===");
        console.log({
            otWeekday,
            otWeekdayNight,
            otWeekend,
            otWeekendNight,
            otHoliday,
            otHolidayNight,
            totalOtHours: otWeekday + otWeekdayNight + otWeekend + otWeekendNight + otHoliday + otHolidayNight
        });

    } catch (e) {
        console.error(e);
    } finally {
        await AppDataSource.destroy();
    }
}

run();
