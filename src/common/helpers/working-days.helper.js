/* eslint-disable */
/**
 * Helper: Tính số ngày làm việc trong khoảng [startDate, endDate]
 * dựa trên shift assignments của nhân viên.
 * 
 * @param {Date} start - ngày bắt đầu
 * @param {Date} end - ngày kết thúc
 * @param {number} employeeId - ID nhân viên
 * @param {import('typeorm').DataSource} dataSource - TypeORM DataSource
 * @returns {Promise<number>} số ngày làm việc
 */
export async function countWorkingDays(start, end, employeeId, dataSource) {
    // Lấy tất cả shift assignments đang hiệu lực của nhân viên hoặc phòng ban
    const employee = await dataSource.getRepository('EmployeeEntity').findOne({
        where: { id: employeeId, isDeleted: false },
    });
    if (!employee) return 0;

    const ShiftAssignment = dataSource.getRepository('ShiftAssignmentEntity');

    // Lấy shift assignments áp dụng cho nhân viên
    const assignments = await ShiftAssignment
        .createQueryBuilder('sa')
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

    // Nếu không tìm thấy assignment → fallback: chỉ tính T2-T6 (weekday 1-5)
    const hasAssignments = assignments.length > 0;

    let count = 0;
    const cursor = new Date(start);
    cursor.setHours(0, 0, 0, 0);
    const endNorm = new Date(end);
    endNorm.setHours(23, 59, 59, 999);

    while (cursor <= endNorm) {
        // JS getDay(): 0=Sun, 1=Mon, ..., 6=Sat
        // Our weekdays convention: 1=Mon, 2=Tue,..., 6=Sat, 7=Sun
        const jsDay = cursor.getDay();
        const ourDay = jsDay === 0 ? 7 : jsDay; // convert to 1-7 (Mon-Sun)

        if (hasAssignments) {
            // Kiểm tra từng assignment xem ngày này có nằm trong weekdays không
            const cursorStr = cursor.toISOString().slice(0, 10);
            const isWorking = assignments.some(sa => {
                const from = sa.effectiveFrom ? new Date(sa.effectiveFrom) : null;
                const to = sa.effectiveTo ? new Date(sa.effectiveTo) : null;
                const inRange = (!from || from <= cursor) && (!to || to >= cursor);
                const weekdays = Array.isArray(sa.weekdays)
                    ? sa.weekdays.map(Number)
                    : (sa.weekdays ? String(sa.weekdays).split(',').map(Number) : [1,2,3,4,5]);
                return inRange && weekdays.includes(ourDay);
            });
            if (isWorking) count++;
        } else {
            // Fallback: Thứ 2-6 (ourDay 1-5)
            if (ourDay >= 1 && ourDay <= 5) count++;
        }

        cursor.setDate(cursor.getDate() + 1);
    }

    return count;
}

/**
 * Helper: Tính số giờ làm việc trong một ngày dựa trên ca làm việc
 * (startTime-endTime trừ breakTime).
 * Fall back to 8h nếu không có ca.
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

    const ShiftAssignment = dataSource.getRepository('ShiftAssignmentEntity');
    const dateStr = date.toISOString().slice(0, 10);

    const assignments = await ShiftAssignment
        .createQueryBuilder('sa')
        .leftJoinAndSelect('sa.shift', 'shift')
        .where('sa.isDeleted = false')
        .andWhere('(sa.employeeId = :empId OR sa.departmentId = :deptId)', 
            { empId: employeeId, deptId: employee.departmentId || 0 })
        .andWhere('(sa.effectiveFrom IS NULL OR sa.effectiveFrom <= :d)', { d: dateStr })
        .andWhere('(sa.effectiveTo IS NULL OR sa.effectiveTo >= :d)', { d: dateStr })
        .getMany();

    if (!assignments.length) return 8;

    const jsDay = date.getDay();
    const ourDay = jsDay === 0 ? 7 : jsDay;

    const match = assignments.find(sa => {
        const weekdays = Array.isArray(sa.weekdays)
            ? sa.weekdays.map(Number)
            : (sa.weekdays ? String(sa.weekdays).split(',').map(Number) : [1,2,3,4,5]);
        return weekdays.includes(ourDay);
    });

    if (!match?.shift) return 8;

    const shift = match.shift;
    if (!shift.startTime || !shift.endTime) return 8;

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
