import {
  AttendanceRecordEntity,
  AttendanceStatus,
  AttendanceType,
} from '../../models/entities/attendance-record.entity.js';
import { AppDataSource } from '../data-source.js';

/**
 * Seed dữ liệu chấm công cho nhân viên từ ID 1 đến 25
 * Khoảng thời gian: Từ 01/02/2026 đến nay
 * Ca làm việc: ID 1 (08:00 - 17:00, nghỉ trưa 12:00 - 13:00)
 */
async function seedAttendance() {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  const repo = AppDataSource.getRepository(AttendanceRecordEntity);

  const employees = Array.from({ length: 25 }, (_, i) => i + 1);

  // Mốc thời gian từ đầu tháng 2/2026 đến nay
  const startDate = new Date('2026-02-01');
  const endDate = new Date(); // Lấy ngày hiện tại

  const records = [];

  for (const empId of employees) {
    let lateCount = 0;
    
    // Random 1-2 nhân viên (ví dụ ID 5, 10) có 1-2 ngày nghỉ
    const isTargetAbsent = empId === 5 || empId === 10;
    let absentCount = 0;
    const maxAbsents = Math.floor(Math.random() * 2) + 1; // 1 hoặc 2 ngày

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Bỏ qua Thứ 7, Chủ Nhật

      const dateStr = d.toISOString().split('T')[0];

      // Logic nghỉ (Absent)
      if (isTargetAbsent && absentCount < maxAbsents && Math.random() < 0.1) {
        absentCount++;
        continue; 
      }

      let checkIn = new Date(`${dateStr}T08:00:00`);
      let checkOut = new Date(`${dateStr}T17:00:00`);
      let lateMins = 0;
      let earlyMins = 0;
      let status = AttendanceStatus.PRESENT;

      const rand = Math.random();

      // 1. Logic đi trễ (LATE): Tối đa 3 ngày/nhân viên
      if (lateCount < 3 && rand < 0.05) { // 5% xác suất trễ
        lateMins = Math.floor(Math.random() * 30) + 1; // Trễ từ 1-30 phút
        checkIn.setMinutes(checkIn.getMinutes() + lateMins);
        status = AttendanceStatus.LATE;
        lateCount++;
      } 
      // 2. Logic đi sớm (Vẫn tính là PRESENT)
      else if (rand < 0.1) {
        checkIn.setMinutes(checkIn.getMinutes() - (Math.floor(Math.random() * 15) + 1));
      }

      // 3. Logic về sớm (EARLY_LEAVE)
      if (rand > 0.9 && rand < 0.95) {
        earlyMins = Math.floor(Math.random() * 20) + 1; // Về sớm 1-20 phút
        checkOut.setMinutes(checkOut.getMinutes() - earlyMins);
        if (status === AttendanceStatus.PRESENT) status = AttendanceStatus.EARLY_LEAVE;
      }
      // 4. Logic về trễ (Hầu hết mọi người về đúng giờ hoặc trễ vài phút)
      else if (rand >= 0.95) {
        checkOut.setMinutes(checkOut.getMinutes() + Math.floor(Math.random() * 60)); // Về trễ tối đa 1 tiếng
      }

      // TÍNH TOÁN CÔNG (Total Work Minutes)
      // Công chuẩn 8 tiếng = 480 phút. Trừ 60 phút nghỉ trưa (12:00 - 13:00)
      let diffMs = checkOut.getTime() - checkIn.getTime();
      let totalMins = Math.floor(diffMs / 60000);
      
      // Luôn trừ 1 giờ nghỉ trưa
      totalMins -= 60; 
      if (totalMins < 0) totalMins = 0;

      records.push({
        employeeId: empId,
        workDate: dateStr,
        workingShiftId: 1, // Fix cứng theo yêu cầu
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
    await repo.createQueryBuilder().delete().execute(); // Xóa sạch bảng an toàn hơn

    console.log(`--- Đang tạo ${records.length} bản ghi mới ---`);
    
    // Insert theo chunk để tránh lỗi memory/timeout với số lượng bản ghi lớn
    const chunkSize = 500;
    for (let i = 0; i < records.length; i += chunkSize) {
      const chunk = records.slice(i, i + chunkSize);
      await repo.createQueryBuilder().insert().values(chunk).execute();
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
