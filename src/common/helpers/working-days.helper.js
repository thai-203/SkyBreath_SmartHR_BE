/* eslint-disable */

/**
 * Helper nội bộ: Kiểm tra nhân viên có TỪNG được gán ca chính (non-OT) hay chưa.
 * Dùng để phân biệt "chưa bao giờ gán ca" vs "có ca nhưng tuần này trống".
 */
async function isShiftBasedEmployee(employeeId, departmentId, dataSource) {
    const count = await dataSource.getRepository('ShiftAssignmentEntity')
        .createQueryBuilder('sa')
        .leftJoin('sa.shift', 'shift')
        .where('sa.isDeleted = false')
        .andWhere('(sa.employeeId = :empId OR sa.departmentId = :deptId)',
            { empId: employeeId, deptId: departmentId || 0 })
        .getCount();

    if (count === 0) return false;

    // Kiểm tra xem có ít nhất 1 ca KHÔNG phải OT không
    const regularCount = await dataSource.getRepository('ShiftAssignmentEntity')
        .createQueryBuilder('sa')
        .leftJoin('sa.shift', 'shift')
        .where('sa.isDeleted = false')
        .andWhere('(sa.employeeId = :empId OR sa.departmentId = :deptId)',
            { empId: employeeId, deptId: departmentId || 0 })
        .andWhere("(shift.shiftName NOT REGEXP :otPattern OR shift.shiftName IS NULL)",
            { otPattern: '(^|[^a-zA-Z])(OT|overtime|over time|tăng ca)([^a-zA-Z]|$)' })
        .getCount();

    return regularCount > 0;
}

/**
 * Helper nội bộ: Lọc bỏ ca OT khỏi danh sách assignments
 */
function filterOutOTAssignments(assignments) {
    return assignments.filter(sa => {
        const name = (sa.shift?.shiftName || sa.assignmentName || '').toLowerCase();
        const isOT = /\bot\b|tăng ca|overtime|over time/i.test(name);
        return !isOT;
    });
}

/**
 * Helper nội bộ: Format Date thành 'YYYY-MM-DD' theo LOCAL timezone.
 * QUAN TRỌNG: Không dùng toISOString() vì nó trả UTC, gây lệch ngày ở UTC+7.
 */
function toLocalYMD(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

/**
 * Helper: Tính số ngày làm việc trong khoảng [startDate, endDate]
 * dựa trên shift assignments của nhân viên.
 * 
 * Logic:
 * - Nếu NV chưa bao giờ được gán ca chính → fallback T2-T6
 * - Nếu NV đã từng được gán ca chính → chỉ tính ngày có ca cover
 *   (tuần nào trống ca = 0 ngày, không cộng thêm)
 * 
 * @param {Date} start - ngày bắt đầu
 * @param {Date} end - ngày kết thúc
 * @param {number} employeeId - ID nhân viên
 * @param {import('typeorm').DataSource} dataSource - TypeORM DataSource
 * @returns {Promise<number>} số ngày làm việc
 */
export async function countWorkingDays(start, end, employeeId, dataSource, isOvertime = false) {
    // Nếu là Tăng ca, mặc định không quan tâm ca làm việc, cứ đếm đủ số ngày
    if (isOvertime) {
        const d1 = new Date(start);
        d1.setHours(0, 0, 0, 0);
        const d2 = new Date(end);
        d2.setHours(0, 0, 0, 0);
        return Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1;
    }

    const employee = await dataSource.getRepository('EmployeeEntity').findOne({
        where: { id: employeeId, isDeleted: false },
    });
    if (!employee) return 0;

    // Bước 1: Xác định nhân viên có phải "nhân viên theo ca" không
    const isShiftBased = await isShiftBasedEmployee(employeeId, employee.departmentId, dataSource);
    console.log('[DEBUG countWorkingDays] employeeId:', employeeId, 'departmentId:', employee.departmentId, 'isShiftBased:', isShiftBased, 'isOvertime:', isOvertime);

    const ShiftAssignment = dataSource.getRepository('ShiftAssignmentEntity');

    // Bước 2: Lấy ca chồng lấn với khoảng ngày yêu cầu
    const allAssignments = await ShiftAssignment
        .createQueryBuilder('sa')
        .leftJoinAndSelect('sa.shift', 'shift')
        .where('sa.isDeleted = false')
        .andWhere(
            '(sa.employeeId = :empId OR sa.departmentId = :deptId)',
            { empId: employeeId, deptId: employee.departmentId || 0 }
        )
        .andWhere(
            '(sa.effectiveFrom IS NULL OR sa.effectiveFrom <= :end)',
            { end: toLocalYMD(end) }
        )
        .andWhere(
            '(sa.effectiveTo IS NULL OR sa.effectiveTo >= :start)',
            { start: toLocalYMD(start) }
        )
        .getMany();

    // Lọc bỏ ca OT
    const regularAssignments = filterOutOTAssignments(allAssignments);
    const hasAssignmentsInRange = regularAssignments.length > 0;
    console.log('[DEBUG countWorkingDays] allAssignments:', allAssignments.length, 'regularAssignments:', regularAssignments.length);
    regularAssignments.forEach(sa => {
        console.log('[DEBUG countWorkingDays]   sa.id:', sa.id, 'weekdays:', sa.weekdays, 'effectiveFrom:', sa.effectiveFrom, 'effectiveTo:', sa.effectiveTo, 'shift:', sa.shift?.shiftName);
    });

    // Bước 3: Duyệt từng ngày và đếm
    let count = 0;
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    const endNorm = new Date(end);
    endNorm.setHours(23, 59, 59, 999);

    while (cursor <= endNorm) {
        const jsDay = cursor.getDay();
        const ourDay = jsDay === 0 ? 7 : jsDay;

        if (isShiftBased) {
            // NV theo ca → chỉ đếm ngày có ca chính cover
            if (hasAssignmentsInRange) {
                const isWorking = regularAssignments.some(sa => {
                    const from = sa.effectiveFrom ? new Date(sa.effectiveFrom) : null;
                    const to = sa.effectiveTo ? new Date(sa.effectiveTo) : null;
                    const inRange = (!from || from <= cursor) && (!to || to >= cursor);
                    const weekdays = Array.isArray(sa.weekdays)
                        ? sa.weekdays.map(Number)
                        : (sa.weekdays ? String(sa.weekdays).split(',').map(Number) : [1, 2, 3, 4, 5]);
                    const matched = inRange && weekdays.includes(ourDay);
                    console.log('[DEBUG countWorkingDays]   date:', toLocalYMD(cursor), 'ourDay:', ourDay, 'weekdays:', weekdays, 'inRange:', inRange, 'matched:', matched);
                    return matched;
                });
                if (isWorking) count++;
            }
            // Nếu tuần này trống ca → count += 0 (đúng nghiệp vụ)
        } else {
            // NV chưa bao giờ gán ca → fallback T2-T6
            if (ourDay >= 1 && ourDay <= 5) count++;
        }

        cursor.setDate(cursor.getDate() + 1);
    }

    console.log('[DEBUG countWorkingDays] RESULT:', count);
    return count;
}

/**
 * Helper: Tính số giờ làm việc trong một ngày dựa trên ca làm việc
 * (startTime-endTime trừ breakTime).
 * 
 * Logic:
 * - NV chưa bao giờ gán ca → fallback 8h
 * - NV theo ca nhưng ngày đó trống → 0h
 * - NV theo ca và ngày đó có ca → tính theo ca
 * 
 * @param {Date} date - ngày cần tính
 * @param {number} employeeId
 * @param {import('typeorm').DataSource} dataSource
 * @returns {Promise<number>} số giờ làm việc trong ngày
 */
export async function getWorkingHoursForDay(date, employeeId, dataSource, isOvertime = false) {
    // Nếu là đơn Tăng ca toàn ngày mà không truyền giờ, có thể mặc định là 8h/ngày hoặc theo người dùng chọn.
    // Tạm thời fix cứng trả 8h vì T7/CN có thể không có ca.
    if (isOvertime) return 8;

    const employee = await dataSource.getRepository('EmployeeEntity').findOne({
        where: { id: employeeId, isDeleted: false },
    });
    if (!employee) return 8;

    const isShiftBased = await isShiftBasedEmployee(employeeId, employee.departmentId, dataSource);

    const ShiftAssignment = dataSource.getRepository('ShiftAssignmentEntity');
    const dateStr = toLocalYMD(date);

    const allAssignments = await ShiftAssignment
        .createQueryBuilder('sa')
        .leftJoinAndSelect('sa.shift', 'shift')
        .where('sa.isDeleted = false')
        .andWhere('(sa.employeeId = :empId OR sa.departmentId = :deptId)',
            { empId: employeeId, deptId: employee.departmentId || 0 })
        .andWhere('(sa.effectiveFrom IS NULL OR sa.effectiveFrom <= :d)', { d: dateStr })
        .andWhere('(sa.effectiveTo IS NULL OR sa.effectiveTo >= :d)', { d: dateStr })
        .getMany();

    const regularAssignments = filterOutOTAssignments(allAssignments);

    if (!regularAssignments.length) {
        // Không có ca chính cover ngày này
        return isShiftBased ? 0 : 8; // Theo ca → 0h | Chưa gán ca → mặc định 8h
    }

    const jsDay = date.getDay();
    const ourDay = jsDay === 0 ? 7 : jsDay;

    const match = regularAssignments.find(sa => {
        const weekdays = Array.isArray(sa.weekdays)
            ? sa.weekdays.map(Number)
            : (sa.weekdays ? String(sa.weekdays).split(',').map(Number) : [1, 2, 3, 4, 5]);
        return weekdays.includes(ourDay);
    });

    if (!match?.shift) {
        return isShiftBased ? 0 : 8;
    }

    const shift = match.shift;
    if (!shift.startTime || !shift.endTime) return isShiftBased ? 0 : 8;

    const toMinutes = (timeStr) => {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    };

    let workMins = toMinutes(shift.endTime) - toMinutes(shift.startTime);
    if (shift.breakStartTime && shift.breakEndTime) {
        workMins -= (toMinutes(shift.breakEndTime) - toMinutes(shift.breakStartTime));
    }

    return Math.max(0, workMins / 60);
}

/**
 * Helper: Tính số giờ yêu cầu trong một khoảng thời gian (có startTime, endTime).
 * Sẽ tính intersection giữa thời gian yêu cầu và ca làm việc (trừ nghỉ trưa).
 * 
 * @param {Date} startDate 
 * @param {Date} endDate 
 * @param {string} reqStartTime 'HH:mm'
 * @param {string} reqEndTime 'HH:mm'
 * @param {number} employeeId
 * @param {import('typeorm').DataSource} dataSource
 * @param {boolean} isOvertime
 */
export async function getRequestedHours(startDate, endDate, reqStartTime, reqEndTime, employeeId, dataSource, isOvertime = false) {
    // 1. TRƯỜNG HỢP TĂNG CA (OT): Đừng trừ theo chuỗi thời gian liên tục, mà tính "mỗi ngày mấy tiếng"
    if (isOvertime) {
        let dailyHours = 0;
        const [startH, startM] = reqStartTime.split(':').map(Number);
        const [endH, endM] = reqEndTime.split(':').map(Number);

        let startMins = startH * 60 + startM;
        let endMins = endH * 60 + endM;

        if (endMins < startMins) {
            // Ca lặp qua đêm (Ví dụ 22:00 -> 02:00 là 4 tiếng)
            endMins += 24 * 60;
        }
        dailyHours = (endMins - startMins) / 60;

        // Cứ mỗi ngày trong khoảng sẽ cộng thêm dailyHours
        const cursor = new Date(startDate);
        cursor.setHours(0, 0, 0, 0);
        const limit = new Date(endDate);
        limit.setHours(0, 0, 0, 0);
        const totalDays = Math.round((limit - cursor) / (1000 * 60 * 60 * 24)) + 1;

        return totalDays * dailyHours;
    }

    const employee = await dataSource.getRepository('EmployeeEntity').findOne({
        where: { id: employeeId, isDeleted: false },
    });

    const startD = new Date(startDate);
    const endD = new Date(endDate);

    if (!employee) {
        // Fallback naive difference if no employee
        const [startH, startM] = reqStartTime.split(':').map(Number);
        const [endH, endM] = reqEndTime.split(':').map(Number);
        startD.setHours(startH, startM, 0, 0);
        endD.setHours(endH, endM, 0, 0);
        return Math.max(0, (endD - startD) / (1000 * 60 * 60));
    }

    const isShiftBased = await isShiftBasedEmployee(employeeId, employee.departmentId, dataSource);
    const ShiftAssignment = dataSource.getRepository('ShiftAssignmentEntity');

    let totalRequestedHours = 0;

    const cursor = new Date(startD);
    cursor.setHours(0, 0, 0, 0);
    const limit = new Date(endD);
    limit.setHours(0, 0, 0, 0);

    const startD_YMD = toLocalYMD(startD);
    const endD_YMD = toLocalYMD(endD);

    const allAssignments = await ShiftAssignment
        .createQueryBuilder('sa')
        .leftJoinAndSelect('sa.shift', 'shift')
        .where('sa.isDeleted = false')
        .andWhere('(sa.employeeId = :empId OR sa.departmentId = :deptId)',
            { empId: employeeId, deptId: employee.departmentId || 0 })
        .andWhere('(sa.effectiveFrom IS NULL OR sa.effectiveFrom <= :endD)', { endD: endD_YMD })
        .andWhere('(sa.effectiveTo IS NULL OR sa.effectiveTo >= :startD)', { startD: startD_YMD })
        .getMany();

    const regularAssignments = filterOutOTAssignments(allAssignments);

    const toMinutes = (timeStr) => {
        const [h, m] = timeStr.split(':').map(Number);
        return h * 60 + m;
    };

    while (cursor <= limit) {
        const jsDay = cursor.getDay();
        const ourDay = jsDay === 0 ? 7 : jsDay;
        const cursorYMD = toLocalYMD(cursor);

        let shift = null;
        if (regularAssignments.length > 0) {
            const match = regularAssignments.find(sa => {
                const from = sa.effectiveFrom ? new Date(sa.effectiveFrom) : null;
                const to = sa.effectiveTo ? new Date(sa.effectiveTo) : null;
                const inRange = (!from || from <= cursor) && (!to || to >= cursor);
                const weekdays = Array.isArray(sa.weekdays)
                    ? sa.weekdays.map(Number)
                    : (sa.weekdays ? String(sa.weekdays).split(',').map(Number) : [1, 2, 3, 4, 5]);
                return inRange && weekdays.includes(ourDay);
            });
            if (match) shift = match.shift;
        }

        // Tính mốc giờ bắt đầu/kết thúc request cho ngày hiện tại
        let startOfReq = toMinutes(cursorYMD === startD_YMD ? reqStartTime : "00:00");
        let endOfReq = toMinutes(cursorYMD === endD_YMD ? reqEndTime : "23:59");
        let workS, workE, breakS, breakE;

        if (shift) {
            workS = toMinutes(shift.startTime);
            workE = toMinutes(shift.endTime);
            breakS = shift.breakStartTime ? toMinutes(shift.breakStartTime) : null;
            breakE = shift.breakEndTime ? toMinutes(shift.breakEndTime) : null;
        } else if (!isShiftBased) {
            // FALLBACK: Nhân viên văn phòng không gán ca -> Mặc định 8h-17h, nghỉ trưa 12h-13h
            workS = toMinutes("08:00");
            workE = toMinutes("17:00");
            breakS = toMinutes("12:00");
            breakE = toMinutes("13:00");
        } else {
            // Nhân viên theo ca nhưng ngày này KHÔNG CÓ CA -> Không tính giờ
            cursor.setDate(cursor.getDate() + 1);
            continue;
        }

        // TÍNH GIAO THOA (INTERSECTION)
        const actualStart = Math.max(startOfReq, workS);
        const actualEnd = Math.min(endOfReq, workE);

        if (actualStart < actualEnd) {
            let diff = actualEnd - actualStart;

            // Trừ giờ nghỉ trưa nếu nó nằm trong khoảng xin nghỉ
            if (breakS !== null && breakE !== null) {
                const overlapBreakS = Math.max(actualStart, breakS);
                const overlapBreakE = Math.min(actualEnd, breakE);
                if (overlapBreakS < overlapBreakE) {
                    diff -= (overlapBreakE - overlapBreakS);
                }
            }
            totalRequestedHours += diff / 60;
        }

        cursor.setDate(cursor.getDate() + 1);
    }

    return totalRequestedHours;
}

