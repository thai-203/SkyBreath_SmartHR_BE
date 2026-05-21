import {
  AttendanceRecordEntity,
  AttendanceStatus,
  AttendanceType,
} from '../../models/entities/attendance-record.entity.js';
import { ShiftScheduleEntity } from '../../models/entities/shift-schedule.entity.js';
import { ShiftAssignmentEntity } from '../../models/entities/shift-assignment.entity.js';
import { WorkingShiftEntity } from '../../models/entities/working-shift.entity.js';
import { EmployeeEntity } from '../../models/entities/employee.entity.js';
import { DepartmentEntity } from '../../models/entities/department.entity.js';
import { AppDataSource } from '../data-source.js';

/**
 * Seed dữ liệu phân ca (Shift Assignments & Schedules) và chấm công (Attendance)
 * Khoảng thời gian: Từ 01/02/2026 đến ngày hôm nay
 */
async function seedAttendance() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }

  const attendanceRepo = AppDataSource.getRepository(AttendanceRecordEntity);
  const scheduleRepo = AppDataSource.getRepository(ShiftScheduleEntity);
  const assignmentRepo = AppDataSource.getRepository(ShiftAssignmentEntity);
  const shiftRepo = AppDataSource.getRepository(WorkingShiftEntity);
  const employeeRepo = AppDataSource.getRepository(EmployeeEntity);
  const departmentRepo = AppDataSource.getRepository(DepartmentEntity);

  // Helper to upsert
  const upsert = async (repo, criteria, data) => {
    let existing = await repo.findOne({ where: criteria });
    if (existing) {
      Object.assign(existing, data);
      return await repo.save(existing);
    }
    return await repo.save(repo.create(data));
  };

  const startDate = new Date('2026-02-01');
  const endDate = new Date(); // Lấy ngày hiện tại

  console.log('--- Đang lấy thông tin hệ thống (Nhân viên, Phòng ban, Ca làm việc) ---');
  const employees = await employeeRepo.find();
  const departments = await departmentRepo.find();
  const shifts = await shiftRepo.find();
  const shiftMap = new Map(shifts.map((s) => [s.id, s]));

  // Lấy ca hành chính (ví dụ ID 1, hoặc tìm theo tên "Ca hành chính")
  let adminShift = shifts.find((s) => s.shiftName === 'Ca hành chính') || shifts[0];
  if (!adminShift) {
    console.log('❌ Không tìm thấy ca làm việc nào trong database.');
    process.exit(1);
  }

  const allDeptIds = departments.map(d => d.id);
  const allEmpIds = employees.map(e => e.id);

  console.log('--- BƯỚC 1: TẠO PHÂN CA & LỊCH LÀM VIỆC (FEB - MAY 2026) ---');
  for (let month = 2; month <= 5; month++) {
    const monthStart = `2026-${String(month).padStart(2, '0')}-01`;
    const monthEnd = new Date(2026, month, 0).toISOString().split('T')[0]; // ngày cuối của tháng

    const assignment = await upsert(assignmentRepo, { assignmentName: `Phân ca tháng ${month}` }, {
      assignmentName: `Phân ca tháng ${month}`,
      employeeIds: allEmpIds.join(','),
      departmentIds: allDeptIds.join(','),
      shiftId: adminShift.id,
      shiftIds: String(adminShift.id),
      effectiveFrom: monthStart,
      effectiveTo: monthEnd,
      weekdays: '1,2,3,4,5', // Thứ 2 đến Thứ 6 (JS .getDay() -> 1: Thứ 2, 5: Thứ 6)
      repeatType: 'weekly',
    });

    // Generate individual schedules
    const scheduleRows = [];
    const startObj = new Date(monthStart);
    const endObj = new Date(monthEnd);
    
    for (let d = new Date(startObj); d <= endObj; d.setDate(d.getDate() + 1)) {
      const dayNum = d.getDay(); // 0: Sun, 1: Mon, ... 6: Sat
      if (dayNum >= 1 && dayNum <= 5) { // T2-T6
        const workDate = d.toISOString().split('T')[0];
        for (const emp of employees) {
          scheduleRows.push({
            assignmentId: assignment.id,
            employeeId: emp.id,
            departmentId: emp.departmentId,
            shiftId: adminShift.id,
            workDate: workDate
          });
        }
      }
    }

    // Bulk upsert schedules for this month
    for (const row of scheduleRows) {
      await upsert(scheduleRepo, { employeeId: row.employeeId, workDate: row.workDate, shiftId: row.shiftId }, row);
    }
    console.log(`✓ Tạo thành công ${scheduleRows.length} bản ghi lịch làm việc cho Tháng ${month}.`);
  }

  console.log('--- BƯỚC 2: TẠO DỮ LIỆU CHẤM CÔNG (TỪ 01/02/2026 ĐẾN NAY) ---');
  // Truy xuất lịch làm việc trong khoảng thời gian đã cho
  const schedules = await scheduleRepo
    .createQueryBuilder('schedule')
    .where('schedule.workDate >= :startDate', { startDate: '2026-02-01' })
    .andWhere('schedule.workDate <= :endDate', {
      endDate: endDate.toISOString().split('T')[0],
    })
    .getMany();

  if (!schedules.length) {
    console.log('❌ Không tìm thấy lịch làm việc nào để sinh dữ liệu chấm công.');
    process.exit(1);
  }

  console.log(`✓ Đã tải ${schedules.length} lịch làm việc để sinh chấm công.`);

  const records = [];

  // Gom nhóm schedules theo employeeId để giả lập logic đi muộn/nghỉ phép tự nhiên hơn cho từng người
  const schedulesByEmp = new Map();
  for (const s of schedules) {
    if (!schedulesByEmp.has(s.employeeId)) schedulesByEmp.set(s.employeeId, []);
    schedulesByEmp.get(s.employeeId).push(s);
  }

  for (const [empId, empSchedules] of schedulesByEmp.entries()) {
    let lateCount = 0;

    // Mỗi người có thể nghỉ 1-2 ngày ngẫu nhiên (tối đa)
    const maxAbsents = Math.floor(Math.random() * 2) + 1;
    let absentCount = 0;

    for (const schedule of empSchedules) {
      const shift = shiftMap.get(schedule.shiftId);
      if (!shift || !shift.startTime || !shift.endTime) continue;

      const dateStr = schedule.workDate;

      // Kết hợp workDate với giờ từ working_shift
      const checkInStr = `${dateStr}T${shift.startTime}`;
      const checkOutStr = `${dateStr}T${shift.endTime}`;

      let checkIn = new Date(checkInStr);
      let checkOut = new Date(checkOutStr);

      // 1. Logic nghỉ (ABSENT)
      if (absentCount < maxAbsents && Math.random() < 0.02) {
        absentCount++;
        records.push({
          employeeId: empId,
          workDate: dateStr,
          workingShiftId: schedule.shiftId,
          assignmentId: schedule.assignmentId,
          checkInTime: null,
          checkOutTime: null,
          attendanceStatus: AttendanceStatus.ABSENT,
          attendanceType: AttendanceType.FACE,
          lateMinutes: 0,
          earlyLeaveMinutes: 0,
          overtimeMinutes: 0,
          totalWorkMinutes: 0,
        });
        continue;
      }

      let lateMins = 0;
      let earlyMins = 0;
      let status = AttendanceStatus.PRESENT;
      const rand = Math.random();

      // 2. Logic đi trễ (LATE) - Tối đa 3 ngày bị đi trễ
      if (lateCount < 3 && rand < 0.05) {
        lateMins = Math.floor(Math.random() * 30) + 1; // 1-30 phút
        checkIn.setMinutes(checkIn.getMinutes() + lateMins);
        status = AttendanceStatus.LATE;
        lateCount++;
      } else if (rand < 0.1) {
        // Đi sớm vài phút
        checkIn.setMinutes(
          checkIn.getMinutes() - (Math.floor(Math.random() * 15) + 1)
        );
      }

      // 3. Logic về sớm (EARLY_LEAVE)
      if (rand > 0.9 && rand < 0.95) {
        earlyMins = Math.floor(Math.random() * 20) + 1; // 1-20 phút
        checkOut.setMinutes(checkOut.getMinutes() - earlyMins);
        if (status === AttendanceStatus.PRESENT) {
          status = AttendanceStatus.EARLY_LEAVE;
        }
      } else if (rand >= 0.95) {
        // Về trễ
        checkOut.setMinutes(
          checkOut.getMinutes() + Math.floor(Math.random() * 60)
        );
      }

      // Tính tổng giờ làm việc
      let diffMs = checkOut.getTime() - checkIn.getTime();
      let totalMins = Math.floor(diffMs / 60000);

      // Trừ giờ nghỉ trưa linh hoạt theo cấu hình ca làm việc
      if (shift.breakStartTime && shift.breakEndTime) {
        const bStart = new Date(`${dateStr}T${shift.breakStartTime}`);
        const bEnd = new Date(`${dateStr}T${shift.breakEndTime}`);
        const breakMins = Math.floor(
          (bEnd.getTime() - bStart.getTime()) / 60000
        );
        if (breakMins > 0) totalMins -= breakMins;
      } else {
        totalMins -= 60; // Mặc định trừ 60 phút
      }

      if (totalMins < 0) totalMins = 0;

      records.push({
        employeeId: empId,
        workDate: dateStr,
        workingShiftId: schedule.shiftId,
        assignmentId: schedule.assignmentId,
        checkInTime: checkIn,
        checkOutTime: checkOut,
        attendanceStatus: status,
        attendanceType: AttendanceType.FACE,
        lateMinutes: lateMins || 0,
        earlyLeaveMinutes: earlyMins || 0,
        overtimeMinutes: 0,
        totalWorkMinutes: totalMins,
      });
    }
  }

  // Xử lý Database
  try {
    console.log('--- Đang dọn dẹp dữ liệu chấm công cũ ---');
    await attendanceRepo.createQueryBuilder().delete().execute();

    console.log(`--- Đang tạo ${records.length} bản ghi chấm công mới ---`);

    // Insert theo chunk để tránh lỗi memory/timeout
    const chunkSize = 500;
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      await attendanceRepo.createQueryBuilder().insert().values(chunk).execute();
    }

    console.log('✅ Seed dữ liệu chấm công hoàn tất!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Lỗi trong quá trình seed:', err);
    process.exit(1);
  }
}

seedAttendance().catch((err) => {
  console.error('❌ Lỗi thực thi script:', err);
  process.exit(1);
});
