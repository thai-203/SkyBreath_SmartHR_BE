import {
  AttendanceRecordEntity,
  AttendanceStatus,
  AttendanceType,
} from '../../models/entities/attendance-record.entity.js';
import { AppDataSource } from '../data-source.js';

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// random time 8h ± 15 phút
function randomCheckIn(date) {
  const d = new Date(date);
  d.setHours(8, randomInt(0, 15), randomInt(0, 59));
  return d;
}

// random check-out: 17h hoặc 20h
function randomCheckOut(date, isOvertime = false) {
  const d = new Date(date);
  if (isOvertime) {
    d.setHours(20, randomInt(0, 10), randomInt(0, 59));
  } else {
    d.setHours(17, randomInt(0, 10), randomInt(0, 59));
  }
  return d;
}

async function seedAttendance() {
  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(AttendanceRecordEntity);

  const employees = Array.from({ length: 22 }, (_, i) => i + 1);

  const startDate = new Date(2026, 3, 1); // 1/4/2026
  const endDate = new Date(2026, 3, 25);

  const records = [];

  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    for (const empId of employees) {
      const workDate = new Date(d);

      // random OT ~ 15% case
      const isOvertime = Math.random() < 0.15;

      const checkIn = randomCheckIn(workDate);
      const checkOut = randomCheckOut(workDate, isOvertime);

      const totalMinutes = Math.floor((checkOut - checkIn) / 60000);

      records.push({
        employeeId: empId,
        workDate: workDate.toISOString().split('T')[0],
        shiftScheduleId: null,
        checkInTime: checkIn,
        checkOutTime: checkOut,
        attendanceStatus: AttendanceStatus.PRESENT,
        attendanceType: AttendanceType.FACE,
        lateMinutes: 0,
        earlyLeaveMinutes: 0,
        overtimeMinutes: isOvertime ? totalMinutes - 9 * 60 : 0,
        totalWorkMinutes: totalMinutes,
      });
    }
  }

  // tránh duplicate nếu chạy lại
  await repo
    .createQueryBuilder()
    .insert()
    .values(records)
    .orIgnore() // MySQL
    .execute();

  console.log('✅ Seed attendance thành công');
  process.exit(0);
}

seedAttendance().catch((err) => {
  console.error(err);
  process.exit(1);
});
