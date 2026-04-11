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
export async function countWorkingDays(start, end, employeeId, dataSource) {
    const employee = await dataSource.getRepository('EmployeeEntity').findOne({
        where: { id: employeeId, isDeleted: false },
    });
    if (!employee) return 0;

    // Bước 1: Xác định nhân viên có phải "nhân viên theo ca" không
    const isShiftBased = await isShiftBasedEmployee(employeeId, employee.departmentId, dataSource);

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
            { end: end.toISOString().slice(0, 10) }
        )
        .andWhere(
            '(sa.effectiveTo IS NULL OR sa.effectiveTo >= :start)',
            { start: start.toISOString().slice(0, 10) }
        )
        .getMany();

    // Lọc bỏ ca OT
    const regularAssignments = filterOutOTAssignments(allAssignments);
    const hasAssignmentsInRange = regularAssignments.length > 0;

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
                        : (sa.weekdays ? String(sa.weekdays).split(',').map(Number) : [1,2,3,4,5]);
                    return inRange && weekdays.includes(ourDay);
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
export async function getWorkingHoursForDay(date, employeeId, dataSource) {
    const employee = await dataSource.getRepository('EmployeeEntity').findOne({
        where: { id: employeeId, isDeleted: false },
    });
    if (!employee) return 8;

    const isShiftBased = await isShiftBasedEmployee(employeeId, employee.departmentId, dataSource);

    const ShiftAssignment = dataSource.getRepository('ShiftAssignmentEntity');
    const dateStr = date.toISOString().slice(0, 10);

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
            : (sa.weekdays ? String(sa.weekdays).split(',').map(Number) : [1,2,3,4,5]);
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
