import { DataSource } from 'typeorm';
import { databaseConfig } from '../../config/database.config.js';
import { RequestEntity } from '../../models/entities/request.entity.js';
import { RequestApprovalLevelEntity } from '../../models/entities/request-approval-level.entity.js';
import { RequestGroupEntity } from '../../models/entities/request-group.entity.js';
import { RequestTypeEntity } from '../../models/entities/request-type.entity.js';
import { OvertimeTypeEntity } from '../../models/entities/overtime-type.entity.js';
import { EmployeeEntity } from '../../models/entities/employee.entity.js';
import { RequestGroupWorkflowEntity } from '../../models/entities/request-group-workflow.entity.js';
import { ApprovalLevelStatus, RequestStatus } from '../../common/enums/request.enum.js';
import { AttendanceRecordEntity, AttendanceStatus, AttendanceType } from '../../models/entities/attendance-record.entity.js';
import { OvertimeRequestDetailEntity } from '../../models/entities/overtime-request-detail.entity.js';
import { toYmd } from '../../common/utils/date.util.js';

const seedRequests = async () => {
  const dataSource = new DataSource(databaseConfig);
  await dataSource.initialize();

  try {
    console.log('--- SEEDING REQUESTS DATA ---');

    const requestRepo = dataSource.getRepository(RequestEntity);
    const approvalRepo = dataSource.getRepository(RequestApprovalLevelEntity);
    const employeeRepo = dataSource.getRepository(EmployeeEntity);
    const requestGroupRepo = dataSource.getRepository(RequestGroupEntity);
    const requestTypeRepo = dataSource.getRepository(RequestTypeEntity);
    const overtimeTypeRepo = dataSource.getRepository(OvertimeTypeEntity);

    // Fetch data
    const employees = await employeeRepo.find({ where: { isDeleted: false } });
    const groups = await requestGroupRepo.find();
    const types = await requestTypeRepo.find({ relations: ['policy'] });
    const overtimeTypes = await overtimeTypeRepo.find();

    if (!employees.length || !groups.length || !types.length) {
      console.log('❌ Thiếu dữ liệu nhân viên, nhóm đơn hoặc loại đơn. Vui lòng chạy initial-seed trước.');
      process.exit(1);
    }

    // Helper functions
    const getGroup = (code) => groups.find((g) => g.code === code);
    const getType = (name) => types.find((t) => t.name.toLowerCase().includes(name.toLowerCase()));
    
    const leaveGroup = getGroup('LEAVE');
    const overtimeGroup = getGroup('OVERTIME');
    const attendanceGroup = getGroup('ATTENDANCE');

    const annualLeaveType = getType('Nghỉ phép năm');
    const sickLeaveType = getType('Nghỉ ốm');
    const otWeekdayType = getType('Tăng ca ngày thường');
    const otWeekendType = getType('Tăng ca cuối tuần');
    const forgetCheckinType = getType('Quên chấm công');

    // Create a generic OT type for Holiday if it doesn't exist, or just use weekend type logic
    const otHolidayDb = overtimeTypes.find(ot => ot.code === 'HOLIDAY');
    const otWeekdayDb = overtimeTypes.find(ot => ot.code === 'WEEKDAY');
    const otWeekendDb = overtimeTypes.find(ot => ot.code === 'WEEKEND');

    const startDate = new Date('2026-02-01');
    const endDate = new Date(); // Today
    const requests = [];
    const approvalLevels = [];

    let requestCodeCounter = 1;
    const generateCode = (dateStr) => {
      const code = `REQ-${dateStr.replace(/-/g, '')}-${String(requestCodeCounter).padStart(3, '0')}`;
      requestCodeCounter++;
      return code;
    };

    const addRequest = (emp, group, type, dateStr, status, data) => {
      if (!group || !type) return;
      
      const req = requestRepo.create({
        requestCode: generateCode(dateStr),
        requestGroupId: group.id,
        requestTypeId: type.id,
        employeeId: emp.id,
        createdByEmployeeId: emp.id,
        status: status,
        submittedAt: new Date(`${dateStr}T08:00:00`),
        approvedAt: status === RequestStatus.APPROVED ? new Date(`${dateStr}T10:00:00`) : null,
        currentApprovalLevel: status === RequestStatus.APPROVED ? 1 : 1,
        totalApprovalLevels: 1,
        currentApproverId: emp.directManagerId || emp.id,
        isWorkedTime: type.policy?.isWorkedTime || false,
        unit: type.policy?.unit || 'DAY',
        ...data,
      });

      requests.push(req);
    };

    // Iterate over employees and generate requests
    for (const emp of employees) {
      // Loop over dates
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = toYmd(d);
        const dayOfWeek = d.getDay(); // 0 is Sunday, 6 is Saturday
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const rand = Math.random();

        // 1. OT Weekday (High probability ~10% on weekdays)
        if (!isWeekend && rand < 0.1) {
          addRequest(emp, overtimeGroup, otWeekdayType, dateStr, RequestStatus.APPROVED, {
            startDate: dateStr, endDate: dateStr,
            startTime: '17:30:00', endTime: '19:30:00',
            quantity: 2, description: 'Tăng ca hoàn thành task gấp',
            overtimeTypeId: otWeekdayDb?.id
          });
        }
        
        // 2. OT Weekend (Low probability ~3% on weekends)
        if (isWeekend && rand < 0.03) {
          addRequest(emp, overtimeGroup, otWeekendType, dateStr, RequestStatus.APPROVED, {
            startDate: dateStr, endDate: dateStr,
            startTime: '08:00:00', endTime: '12:00:00',
            quantity: 4, description: 'Trực hệ thống cuối tuần',
            overtimeTypeId: otWeekendDb?.id || otWeekdayDb?.id
          });
        }

        // 3. Forget Checkin (~2% any day)
        if (!isWeekend && rand >= 0.98) {
          addRequest(emp, attendanceGroup, forgetCheckinType, dateStr, RequestStatus.APPROVED, {
            startDate: dateStr, endDate: dateStr,
            quantity: 1, description: 'Quên chấm công buổi sáng do lỗi mạng',
          });
        }

        // 4. Annual Leave (~1% any day)
        if (!isWeekend && rand >= 0.97 && rand < 0.98) {
          addRequest(emp, leaveGroup, annualLeaveType, dateStr, RequestStatus.APPROVED, {
            startDate: dateStr, endDate: dateStr,
            quantity: 1, description: 'Nghỉ phép giải quyết việc gia đình',
          });
        }

        // 5. Sick Leave (~0.5% any day)
        if (!isWeekend && rand >= 0.965 && rand < 0.97) {
          addRequest(emp, leaveGroup, sickLeaveType, dateStr, RequestStatus.APPROVED, {
            startDate: dateStr, endDate: dateStr,
            quantity: 1, description: 'Nghỉ ốm đi khám bệnh',
          });
        }
      }

      // Add a pending request for demonstration
      if (Math.random() < 0.5) {
        const pendingDate = toYmd(new Date());
        addRequest(emp, overtimeGroup, otWeekdayType, pendingDate, RequestStatus.PENDING, {
          startDate: pendingDate, endDate: pendingDate,
          startTime: '17:30:00', endTime: '20:30:00',
          quantity: 3, description: 'Xin tăng ca tối nay',
          overtimeTypeId: otWeekdayDb?.id
        });
      }
    }

    console.log(`--- Đang dọn dẹp dữ liệu đơn từ cũ ---`);
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 0;');
    await dataSource.query('TRUNCATE TABLE request_approval_levels;');
    await dataSource.query('TRUNCATE TABLE overtime_request_details;');
    await dataSource.query('TRUNCATE TABLE requests;');
    await dataSource.query('SET FOREIGN_KEY_CHECKS = 1;');

    console.log(`--- Đang lưu ${requests.length} đơn từ mới ---`);
    
    // Save requests
    const chunkSize = 200;
    for (let i = 0; i < requests.length; i += chunkSize) {
      const chunk = requests.slice(i, i + chunkSize);
      await requestRepo.save(chunk);
    }

    // Generate approval levels for the saved requests
    const savedRequests = await requestRepo.find();
    for (const req of savedRequests) {
      approvalLevels.push(approvalRepo.create({
        requestId: req.id,
        levelOrder: 1,
        levelName: 'Quản lý trực tiếp duyệt',
        approverType: 'DIRECT_MANAGER',
        approverEmployeeId: req.currentApproverId,
        status: req.status === RequestStatus.APPROVED ? ApprovalLevelStatus.APPROVED : ApprovalLevelStatus.PENDING,
        processedAt: req.status === RequestStatus.APPROVED ? req.approvedAt : null,
        actionedAt: req.status === RequestStatus.APPROVED ? req.approvedAt : null,
        actionedByEmployeeId: req.status === RequestStatus.APPROVED ? req.currentApproverId : null,
      }));
    }

    console.log(`--- Đang lưu ${approvalLevels.length} cấp duyệt tương ứng ---`);
    for (let i = 0; i < approvalLevels.length; i += chunkSize) {
      const chunk = approvalLevels.slice(i, i + chunkSize);
      await approvalRepo.save(chunk);
    }

    console.log(`--- Đang lưu chi tiết đơn OT (OvertimeRequestDetail) ---`);
    const otDetailRepo = dataSource.getRepository(OvertimeRequestDetailEntity);
    const otDetails = [];
    for (const req of savedRequests) {
      if (req.requestGroupId === overtimeGroup.id) {
        otDetails.push(otDetailRepo.create({
          requestId: req.id,
          overtimeTypeId: req.overtimeTypeId,
          workDate: req.startDate,
          startTime: req.startTime,
          endTime: req.endTime,
          totalHours: req.quantity,
          reason: req.description,
        }));
      }
    }
    for (let i = 0; i < otDetails.length; i += chunkSize) {
      const chunk = otDetails.slice(i, i + chunkSize);
      await otDetailRepo.save(chunk);
    }

    console.log(`--- Đang đồng bộ dữ liệu chấm công với đơn tăng ca đã duyệt ---`);
    const attendanceRepo = dataSource.getRepository(AttendanceRecordEntity);
    const approvedOvertimeRequests = savedRequests.filter(
      (req) => req.status === RequestStatus.APPROVED && req.requestGroupId === overtimeGroup.id
    );

    for (const req of approvedOvertimeRequests) {
      const dateStr = req.startDate;

      if (req.requestTypeId === otWeekdayType.id) {
        // Tăng ca ngày thường: Cập nhật checkOutTime của ngày đó
        const attendance = await attendanceRepo.findOne({
          where: { employeeId: req.employeeId, workDate: dateStr },
        });
        if (attendance && req.endTime) {
          const newCheckOut = new Date(`${dateStr}T${req.endTime}`);
          // Nếu giờ đăng ký OT lớn hơn giờ ra thực tế, thì kéo dài giờ ra
          if (!attendance.checkOutTime || newCheckOut > attendance.checkOutTime) {
            attendance.checkOutTime = newCheckOut;
            if (attendance.checkInTime) {
              const diffMs = attendance.checkOutTime.getTime() - attendance.checkInTime.getTime();
              let totalMins = Math.floor(diffMs / 60000) - 60; // Trừ 60p nghỉ trưa mặc định
              if (totalMins < 0) totalMins = 0;
              attendance.totalWorkMinutes = totalMins;

              // Giả sử ca hành chính kết thúc lúc 17:00, OT bắt đầu tính từ đó
              const standardEnd = new Date(`${dateStr}T17:00:00`);
              let otMins = Math.floor((attendance.checkOutTime.getTime() - standardEnd.getTime()) / 60000);
              if (otMins < 0) otMins = 0;
              attendance.overtimeMinutes = otMins;
            }
            await attendanceRepo.save(attendance);
          }
        }
      } else if (req.requestTypeId === otWeekendType.id || req.requestTypeId === otHolidayDb?.id) {
        // Tăng ca ngày nghỉ/lễ: Tạo record mới nếu chưa có
        const attendance = await attendanceRepo.findOne({
          where: { employeeId: req.employeeId, workDate: dateStr },
        });
        if (!attendance && req.startTime && req.endTime) {
          const checkIn = new Date(`${dateStr}T${req.startTime}`);
          const checkOut = new Date(`${dateStr}T${req.endTime}`);
          const diffMs = checkOut.getTime() - checkIn.getTime();
          let totalMins = Math.floor(diffMs / 60000);
          if (totalMins > 240) totalMins -= 60; // Trừ 1 tiếng nghỉ trưa nếu làm > 4 tiếng

          const newRecord = attendanceRepo.create({
            employeeId: req.employeeId,
            workDate: dateStr,
            workingShiftId: null, // OT vào ngày nghỉ/không có ca
            assignmentId: null,
            checkInTime: checkIn,
            checkOutTime: checkOut,
            attendanceStatus: AttendanceStatus.PRESENT,
            attendanceType: AttendanceType.FACE,
            lateMinutes: 0,
            earlyLeaveMinutes: 0,
            overtimeMinutes: totalMins, // Toàn bộ thời gian làm là OT
            totalWorkMinutes: totalMins,
          });
          await attendanceRepo.save(newRecord);
        }
      }
    }

    console.log('✅ Seed dữ liệu đơn từ hoàn tất!');
    process.exit(0);

  } catch (error) {
    console.error('Seed Error:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
};

seedRequests();
