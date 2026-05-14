import { DataSource } from 'typeorm';
import { databaseConfig } from '../../config/database.config.js';
import { PermissionEntity } from '../../models/entities/permission.entity.js';
import { RoleEntity } from '../../models/entities/role.entity.js';
import { RolePermissionEntity } from '../../models/entities/role-permission.entity.js';

const seed = async () => {
  const dataSource = new DataSource(databaseConfig);
  await dataSource.initialize();

  try {
    console.log('Seeding permissions and role-permission mappings...');

    // 1. Khởi tạo danh sách quyền mới dựa trên danh sách bạn cung cấp
    const permissionsData = [
      // ================= AI =================
      {
        permissionCode: 'AI_CONFIGURATION_READ',
        description: 'Xem cấu hình AI',
        module: 'Ai',
      },
      {
        permissionCode: 'AI_PROMPT_READ',
        description: 'Xem prompt AI',
        module: 'Ai',
      },
      // ================= ATTENDANCE =================
      {
        permissionCode: 'ATTENDANCE_BLOCKING_CONFIG_CREATE',
        description: 'Tạo cấu hình chặn chấm công',
        module: 'Attendance',
      },
      {
        permissionCode: 'ATTENDANCE_BLOCKING_CONFIG_DELETE',
        description: 'Xóa cấu hình chặn chấm công',
        module: 'Attendance',
      },
      {
        permissionCode: 'ATTENDANCE_BLOCKING_CONFIG_READ',
        description: 'Xem cấu hình chặn chấm công',
        module: 'Attendance',
      },
      {
        permissionCode: 'ATTENDANCE_BLOCKING_CONFIG_STATUS_CHANGE',
        description: 'Thay đổi trạng thái cấu hình chặn',
        module: 'Attendance',
      },
      {
        permissionCode: 'ATTENDANCE_BLOCKING_CONFIG_UPDATE',
        description: 'Cập nhật cấu hình chặn chấm công',
        module: 'Attendance',
      },
      {
        permissionCode: 'ATTENDANCE_FACE_DATA_DELETE',
        description: 'Xóa dữ liệu khuôn mặt',
        module: 'Attendance',
      },
      {
        permissionCode: 'ATTENDANCE_FACE_DATA_READ',
        description: 'Xem dữ liệu khuôn mặt nhân viên',
        module: 'Attendance',
      },
      {
        permissionCode: 'ATTENDANCE_FACE_DATA_READ_OWN',
        description: 'Xem dữ liệu khuôn mặt bản thân',
        module: 'Attendance',
      },
      {
        permissionCode: 'ATTENDANCE_FACE_DATA_REGISTER',
        description: 'Đăng ký dữ liệu khuôn mặt',
        module: 'Attendance',
      },
      {
        permissionCode: 'ATTENDANCE_FACE_RECOGNITION_CONFIG_READ',
        description: 'Xem cấu hình nhận diện khuôn mặt',
        module: 'Attendance',
      },
      {
        permissionCode: 'ATTENDANCE_FACE_RECOGNITION_CONFIG_UPDATE',
        description: 'Cập nhật cấu hình nhận diện khuôn mặt',
        module: 'Attendance',
      },
      {
        permissionCode: 'ATTENDANCE_READ_OWN',
        description: 'Xem dữ liệu chấm công của bản thân',
        module: 'Attendance',
      },
      {
        permissionCode: 'ATTENDANCE_RECORD',
        description: 'Thực hiện ghi nhận chấm công',
        module: 'Attendance',
      },
      {
        permissionCode: 'ATTENDANCE_SECURITY_CONFIG_READ',
        description: 'Xem cấu hình bảo mật chấm công',
        module: 'Attendance',
      },
      {
        permissionCode: 'ATTENDANCE_SECURITY_CONFIG_UPDATE',
        description: 'Cập nhật cấu hình bảo mật chấm công',
        module: 'Attendance',
      },
      // ================= CONTRACT =================
      {
        permissionCode: 'CONTRACT_CREATE',
        description: 'Tạo hợp đồng',
        module: 'Contract',
      },
      {
        permissionCode: 'CONTRACT_DELETE',
        description: 'Xóa hợp đồng',
        module: 'Contract',
      },
      {
        permissionCode: 'CONTRACT_EXPORT',
        description: 'Xuất dữ liệu hợp đồng',
        module: 'Contract',
      },
      {
        permissionCode: 'CONTRACT_READ',
        description: 'Xem hợp đồng',
        module: 'Contract',
      },
      {
        permissionCode: 'CONTRACT_TERMINATE',
        description: 'Chấm dứt hợp đồng',
        module: 'Contract',
      },
      {
        permissionCode: 'CONTRACT_UPDATE',
        description: 'Cập nhật hợp đồng',
        module: 'Contract',
      },
      // ================= DEPARTMENT =================
      {
        permissionCode: 'DEPARTMENT_CREATE',
        description: 'Tạo phòng ban',
        module: 'Department',
      },
      {
        permissionCode: 'DEPARTMENT_DELETE',
        description: 'Xóa phòng ban',
        module: 'Department',
      },
      {
        permissionCode: 'DEPARTMENT_EXPORT',
        description: 'Xuất dữ liệu phòng ban',
        module: 'Department',
      },
      {
        permissionCode: 'DEPARTMENT_READ',
        description: 'Xem phòng ban',
        module: 'Department',
      },
      {
        permissionCode: 'DEPARTMENT_UPDATE',
        description: 'Cập nhật phòng ban',
        module: 'Department',
      },
      // ================= EMPLOYEE =================
      {
        permissionCode: 'EMPLOYEE_CREATE',
        description: 'Thêm mới nhân viên',
        module: 'Employee',
      },
      {
        permissionCode: 'EMPLOYEE_DELETE',
        description: 'Xóa nhân viên',
        module: 'Employee',
      },
      {
        permissionCode: 'EMPLOYEE_EXPORT',
        description: 'Xuất dữ liệu nhân viên',
        module: 'Employee',
      },
      {
        permissionCode: 'EMPLOYEE_READ',
        description: 'Xem danh sách nhân viên',
        module: 'Employee',
      },
      {
        permissionCode: 'EMPLOYEE_UPDATE',
        description: 'Cập nhật nhân viên',
        module: 'Employee',
      },
      // ================= HOLIDAY =================
      {
        permissionCode: 'HOLIDAY_CONFIG',
        description: 'Cấu hình ngày lễ',
        module: 'Holiday',
      },
      {
        permissionCode: 'HOLIDAY_CREATE',
        description: 'Tạo ngày lễ',
        module: 'Holiday',
      },
      {
        permissionCode: 'HOLIDAY_DELETE',
        description: 'Xóa ngày lễ',
        module: 'Holiday',
      },
      {
        permissionCode: 'HOLIDAY_EXPORT',
        description: 'Quyền HOLIDAY_EXPORT',
        module: 'Holiday',
      },
      {
        permissionCode: 'HOLIDAY_GROUP_CREATE',
        description: 'Tạo nhóm ngày lễ',
        module: 'Holiday',
      },
      {
        permissionCode: 'HOLIDAY_GROUP_DELETE',
        description: 'Xóa nhóm ngày lễ',
        module: 'Holiday',
      },
      {
        permissionCode: 'HOLIDAY_GROUP_READ',
        description: 'Xem nhóm ngày lễ',
        module: 'Holiday',
      },
      {
        permissionCode: 'HOLIDAY_GROUP_UPDATE',
        description: 'Cập nhật nhóm ngày lễ',
        module: 'Holiday',
      },
      {
        permissionCode: 'HOLIDAY_NOTIFICATION_SEND',
        description: 'Gửi thông báo nghỉ lễ',
        module: 'Holiday',
      },
      {
        permissionCode: 'HOLIDAY_READ',
        description: 'Xem ngày lễ',
        module: 'Holiday',
      },
      {
        permissionCode: 'HOLIDAY_READ_OWN',
        description: 'Xem lịch nghỉ lễ cá nhân',
        module: 'Holiday',
      },
      {
        permissionCode: 'HOLIDAY_UPDATE',
        description: 'Cập nhật ngày lễ',
        module: 'Holiday',
      },
      // ================= NOTIFICATION =================
      {
        permissionCode: 'SEND_MANUAL_NOTIFICATION',
        description: 'Gửi thông báo thủ công',
        module: 'Notification',
      },
      {
        permissionCode: 'VIEW_NOTIFICATION_HISTORY',
        description: 'Xem lịch sử thông báo',
        module: 'Notification',
      },
      // ================= ONBOARDING =================
      {
        permissionCode: 'ONBOARDING_PLAN_CREATE',
        description: 'Tạo kế hoạch hội nhập',
        module: 'Onboarding',
      },
      {
        permissionCode: 'ONBOARDING_PLAN_DELETE',
        description: 'Xóa kế hoạch hội nhập',
        module: 'Onboarding',
      },
      {
        permissionCode: 'ONBOARDING_PLAN_MANAGE',
        description: 'Quyền ONBOARDING_PLAN_MANAGE',
        module: 'Onboarding',
      },
      {
        permissionCode: 'ONBOARDING_PLAN_READ',
        description: 'Xem kế hoạch hội nhập',
        module: 'Onboarding',
      },
      {
        permissionCode: 'ONBOARDING_PLAN_UPDATE',
        description: 'Cập nhật kế hoạch hội nhập',
        module: 'Onboarding',
      },
      {
        permissionCode: 'ONBOARDING_PROGRESS_COMPLETE',
        description: 'Hoàn thành tiến độ hội nhập',
        module: 'Onboarding',
      },
      {
        permissionCode: 'ONBOARDING_PROGRESS_CREATE',
        description: 'Tạo tiến độ hội nhập',
        module: 'Onboarding',
      },
      {
        permissionCode: 'ONBOARDING_PROGRESS_EXPORT',
        description: 'Xuất dữ liệu hội nhập',
        module: 'Onboarding',
      },
      {
        permissionCode: 'ONBOARDING_PROGRESS_MANAGE',
        description: 'Quyền ONBOARDING_PROGRESS_MANAGE',
        module: 'Onboarding',
      },
      {
        permissionCode: 'ONBOARDING_PROGRESS_READ',
        description: 'Xem tiến độ hội nhập',
        module: 'Onboarding',
      },
      {
        permissionCode: 'ONBOARDING_PROGRESS_READ_OWN',
        description: 'Xem tiến độ hội nhập cá nhân',
        module: 'Onboarding',
      },
      {
        permissionCode: 'ONBOARDING_PROGRESS_UPDATE',
        description: 'Quyền ONBOARDING_PROGRESS_UPDATE',
        module: 'Onboarding',
      },
      {
        permissionCode: 'ONBOARDING_PROGRESS_UPDATE_OWN',
        description: 'Cập nhật tiến độ hội nhập cá nhân',
        module: 'Onboarding',
      },
      // ================= OVERTIME =================
      {
        permissionCode: 'OVERTIME_RULE_CREATE',
        description: 'Tạo quy định tăng ca',
        module: 'Overtime',
      },
      {
        permissionCode: 'OVERTIME_RULE_DELETE',
        description: 'Xóa quy định tăng ca',
        module: 'Overtime',
      },
      {
        permissionCode: 'OVERTIME_RULE_READ',
        description: 'Xem quy định tăng ca',
        module: 'Overtime',
      },
      {
        permissionCode: 'OVERTIME_RULE_READ_OWN',
        description: 'Xem quy định tăng ca cá nhân',
        module: 'Overtime',
      },
      {
        permissionCode: 'OVERTIME_RULE_UPDATE',
        description: 'Cập nhật quy định tăng ca',
        module: 'Overtime',
      },
      // ================= PAYROLL =================
      {
        permissionCode: 'PAYROLL_APPROVE',
        description: 'Phê duyệt bảng lương',
        module: 'Payroll',
      },
      {
        permissionCode: 'PAYROLL_CREATE',
        description: 'Khởi tạo bảng lương',
        module: 'Payroll',
      },
      {
        permissionCode: 'PAYROLL_EXPORT',
        description: 'Xuất dữ liệu bảng lương',
        module: 'Payroll',
      },
      {
        permissionCode: 'PAYROLL_LOCK',
        description: 'Chốt/Khóa bảng lương',
        module: 'Payroll',
      },
      {
        permissionCode: 'PAYROLL_READ',
        description: 'Xem bảng lương',
        module: 'Payroll',
      },
      {
        permissionCode: 'PAYROLL_SEND_PAYSLIPS',
        description: 'Quyền PAYROLL_SEND_PAYSLIPS',
        module: 'Payroll',
      },
      {
        permissionCode: 'PAYROLL_TYPE_CREATE',
        description: 'Tạo loại bảng lương',
        module: 'Payroll',
      },
      {
        permissionCode: 'PAYROLL_TYPE_DELETE',
        description: 'Xóa loại bảng lương',
        module: 'Payroll',
      },
      {
        permissionCode: 'PAYROLL_TYPE_READ',
        description: 'Xem loại bảng lương',
        module: 'Payroll',
      },
      {
        permissionCode: 'PAYROLL_TYPE_UPDATE',
        description: 'Cập nhật loại bảng lương',
        module: 'Payroll',
      },
      {
        permissionCode: 'PAYROLL_UPDATE',
        description: 'Cập nhật bảng lương',
        module: 'Payroll',
      },
      // ================= PENALTY =================
      {
        permissionCode: 'PENALTY_CREATE',
        description: 'Tạo quy định phạt',
        module: 'Penalty',
      },
      {
        permissionCode: 'PENALTY_DELETE',
        description: 'Xóa quy định phạt',
        module: 'Penalty',
      },
      {
        permissionCode: 'PENALTY_READ',
        description: 'Xem quy định phạt',
        module: 'Penalty',
      },
      {
        permissionCode: 'PENALTY_READ_OWN',
        description: 'Xem quy định phạt cá nhân',
        module: 'Penalty',
      },
      {
        permissionCode: 'PENALTY_UPDATE',
        description: 'Cập nhật quy định phạt',
        module: 'Penalty',
      },
      // ================= PERFORMANCE_REVIEW =================
      {
        permissionCode: 'PERFORMANCE_REVIEW_CREATE',
        description: 'Quyền PERFORMANCE_REVIEW_CREATE',
        module: 'Performance_review',
      },
      {
        permissionCode: 'PERFORMANCE_REVIEW_DELETE',
        description: 'Quyền PERFORMANCE_REVIEW_DELETE',
        module: 'Performance_review',
      },
      {
        permissionCode: 'PERFORMANCE_REVIEW_READ',
        description: 'Quyền PERFORMANCE_REVIEW_READ',
        module: 'Performance_review',
      },
      {
        permissionCode: 'PERFORMANCE_REVIEW_UPDATE',
        description: 'Quyền PERFORMANCE_REVIEW_UPDATE',
        module: 'Performance_review',
      },
      // ================= REQUEST =================
      {
        permissionCode: 'REQUEST_APPROVE',
        description: 'Phê duyệt yêu cầu',
        module: 'Request',
      },
      {
        permissionCode: 'REQUEST_CANCEL',
        description: 'Hủy yêu cầu',
        module: 'Request',
      },
      {
        permissionCode: 'REQUEST_CREATE',
        description: 'Tạo yêu cầu mới',
        module: 'Request',
      },
      {
        permissionCode: 'REQUEST_GROUP_CREATE',
        description: 'Tạo nhóm yêu cầu',
        module: 'Request',
      },
      {
        permissionCode: 'REQUEST_GROUP_DELETE',
        description: 'Xóa nhóm yêu cầu',
        module: 'Request',
      },
      {
        permissionCode: 'REQUEST_GROUP_READ',
        description: 'Xem nhóm yêu cầu',
        module: 'Request',
      },
      {
        permissionCode: 'REQUEST_GROUP_UPDATE',
        description: 'Cập nhật nhóm yêu cầu',
        module: 'Request',
      },
      {
        permissionCode: 'REQUEST_READ',
        description: 'Xem danh sách yêu cầu',
        module: 'Request',
      },
      {
        permissionCode: 'REQUEST_READ_OWN',
        description: 'Xem yêu cầu của bản thân',
        module: 'Request',
      },
      {
        permissionCode: 'REQUEST_TYPE_CREATE',
        description: 'Tạo loại yêu cầu',
        module: 'Request',
      },
      {
        permissionCode: 'REQUEST_TYPE_DELETE',
        description: 'Xóa loại yêu cầu',
        module: 'Request',
      },
      {
        permissionCode: 'REQUEST_TYPE_POLICY_CONFIG',
        description: 'Cấu hình chính sách loại yêu cầu',
        module: 'Request',
      },
      {
        permissionCode: 'REQUEST_TYPE_READ',
        description: 'Xem loại yêu cầu',
        module: 'Request',
      },
      {
        permissionCode: 'REQUEST_TYPE_UPDATE',
        description: 'Cập nhật loại yêu cầu',
        module: 'Request',
      },
      {
        permissionCode: 'REQUEST_UPDATE',
        description: 'Quyền REQUEST_UPDATE',
        module: 'Request',
      },
      // ================= SHIFT =================
      {
        permissionCode: 'SHIFT_ASSIGN_CREATE',
        description: 'Thực hiện phân ca',
        module: 'Shift',
      },
      {
        permissionCode: 'SHIFT_ASSIGN_DELETE',
        description: 'Xóa phân ca',
        module: 'Shift',
      },
      {
        permissionCode: 'SHIFT_ASSIGN_MANAGE',
        description: 'Quyền SHIFT_ASSIGN_MANAGE',
        module: 'Shift',
      },
      {
        permissionCode: 'SHIFT_ASSIGN_READ',
        description: 'Xem phân ca',
        module: 'Shift',
      },
      {
        permissionCode: 'SHIFT_ASSIGN_UPDATE',
        description: 'Cập nhật phân ca',
        module: 'Shift',
      },
      {
        permissionCode: 'SHIFT_CREATE',
        description: 'Tạo ca làm việc',
        module: 'Shift',
      },
      {
        permissionCode: 'SHIFT_DELETE',
        description: 'Xóa ca làm việc',
        module: 'Shift',
      },
      {
        permissionCode: 'SHIFT_GROUP_CREATE',
        description: 'Tạo nhóm ca làm việc',
        module: 'Shift',
      },
      {
        permissionCode: 'SHIFT_GROUP_DELETE',
        description: 'Xóa nhóm ca làm việc',
        module: 'Shift',
      },
      {
        permissionCode: 'SHIFT_GROUP_READ',
        description: 'Xem nhóm ca làm việc',
        module: 'Shift',
      },
      {
        permissionCode: 'SHIFT_GROUP_UPDATE',
        description: 'Cập nhật nhóm ca làm việc',
        module: 'Shift',
      },
      {
        permissionCode: 'SHIFT_READ',
        description: 'Xem danh sách ca làm việc',
        module: 'Shift',
      },
      {
        permissionCode: 'SHIFT_READ_OWN',
        description: 'Xem ca làm việc cá nhân',
        module: 'Shift',
      },
      {
        permissionCode: 'SHIFT_SCHEDULE_READ',
        description: 'Xem lịch trình làm việc',
        module: 'Shift',
      },
      {
        permissionCode: 'SHIFT_UPDATE',
        description: 'Cập nhật ca làm việc',
        module: 'Shift',
      },
      // ================= TIMESHEET =================
      {
        permissionCode: 'TIMESHEET_CREATE',
        description: 'Tạo bảng công',
        module: 'Timesheet',
      },
      {
        permissionCode: 'TIMESHEET_DELETE',
        description: 'Quyền TIMESHEET_DELETE',
        module: 'Timesheet',
      },
      {
        permissionCode: 'TIMESHEET_EXPORT',
        description: 'Xuất bảng công',
        module: 'Timesheet',
      },
      {
        permissionCode: 'TIMESHEET_LOCK',
        description: 'Chốt bảng công',
        module: 'Timesheet',
      },
      {
        permissionCode: 'TIMESHEET_READ',
        description: 'Xem bảng công',
        module: 'Timesheet',
      },
      {
        permissionCode: 'TIMESHEET_READ_OWN',
        description: 'Xem bảng công cá nhân',
        module: 'Timesheet',
      },
      {
        permissionCode: 'TIMESHEET_UPDATE',
        description: 'Cập nhật bảng công',
        module: 'Timesheet',
      },
      {
        permissionCode: 'AI_PROMPT_CREATE',
        description: 'Tạo prompt AI',
        module: 'AI',
      },
      {
        permissionCode: 'AI_PROMPT_UPDATE',
        description: 'Cập nhật prompt AI',
        module: 'AI',
      },
      {
        permissionCode: 'AI_PROMPT_DELETE',
        description: 'Xóa prompt AI',
        module: 'AI',
      },

      // ================= USER =================
      {
        permissionCode: 'USER_ACTION_LOG_EXPORT',
        description: 'Xuất nhật ký hoạt động',
        module: 'User',
      },
      {
        permissionCode: 'USER_ACTION_LOG_READ',
        description: 'Xem nhật ký hoạt động',
        module: 'User',
      },
      {
        permissionCode: 'USER_CREATE',
        description: 'Tạo người dùng',
        module: 'User',
      },
      {
        permissionCode: 'USER_DELETE',
        description: 'Xóa người dùng',
        module: 'User',
      },
      {
        permissionCode: 'USER_LOCK',
        description: 'Khóa tài khoản người dùng',
        module: 'User',
      },
      {
        permissionCode: 'USER_PASSWORD_RESET_FORCE',
        description: 'Bắt buộc đổi mật khẩu',
        module: 'User',
      },
      {
        permissionCode: 'USER_READ',
        description: 'Xem người dùng',
        module: 'User',
      },
      {
        permissionCode: 'USER_ROLE_REMOVE',
        description: 'Gỡ vai trò người dùng',
        module: 'User',
      },
      {
        permissionCode: 'USER_UPDATE',
        description: 'Cập nhật người dùng',
        module: 'User',
      },
    ];

    const permissionRepo = dataSource.getRepository(PermissionEntity);
    const permissions = [];

    for (const p of permissionsData) {
      let permission = await permissionRepo.findOne({
        where: { permissionCode: p.permissionCode },
      });
      if (!permission) {
        permission = permissionRepo.create(p);
        await permissionRepo.save(permission);
        console.log(`✓ Created: ${p.permissionCode}`);
      } else {
        permission.description = p.description;
        permission.module = p.module;
        await permissionRepo.save(permission);
        console.log(`- Updated: ${p.permissionCode}`);
      }
      permissions.push(permission);
    }

    // 2. Logic mapping Role-Permission (giữ nguyên cấu trúc của bạn)
    const roleRepo = dataSource.getRepository(RoleEntity);
    const roles = await roleRepo.find();
    if (roles.length === 0) return;

    const roleMap = {};
    roles.forEach((role) => (roleMap[role.roleName] = role));

    const rolePermissionRepo = dataSource.getRepository(RolePermissionEntity);
    await rolePermissionRepo.clear();

    // Mapping ADMIN (Tất cả)
    if (roleMap['ADMIN']) {
      const adminMappings = permissions.map((p) =>
        rolePermissionRepo.create({
          roleId: roleMap['ADMIN'].id,
          permissionId: p.id,
        }),
      );
      await rolePermissionRepo.save(adminMappings);
      console.log('✓ Mapped all permissions to ADMIN role');
    }

    // Mapping MANAGER (Giám đốc)
    if (roleMap['MANAGER']) {
      const managerPermissions = [
        // Core: xem dữ liệu đội nhóm + phê duyệt
        'EMPLOYEE_READ',
        'DEPARTMENT_READ',

        // Attendance/Timesheet: xem báo cáo và theo dõi (trong danh sách permission hiện có)
        'ATTENDANCE_READ_OWN',
        'SHIFT_READ',
        'SHIFT_ASSIGN_READ',
        'SHIFT_SCHEDULE_READ',
        'TIMESHEET_READ',

        // Requests: xem danh sách chờ duyệt + approve/reject
        'REQUEST_READ',
        'REQUEST_APPROVE',

        // Payroll approvals
        'PAYROLL_READ',
        'PAYROLL_APPROVE',

        // Notification history
        'VIEW_NOTIFICATION_HISTORY',
        'ONBOARDING_PROGRESS_READ_OWN',
        'ONBOARDING_PROGRESS_UPDATE_OWN',
      ];
      const managerMappings = permissions
        .filter((p) => managerPermissions.includes(p.permissionCode))
        .map((p) =>
          rolePermissionRepo.create({
            roleId: roleMap['MANAGER'].id,
            permissionId: p.id,
          }),
        );
      await rolePermissionRepo.save(managerMappings);
      console.log(
        `✓ Mapped ${managerMappings.length} permissions to MANAGER role`,
      );
    }

    // Mapping HR (Nhân viên nhân sự)
    if (roleMap['HR']) {
      const hrPermissions = [
        // Employee profile
        'EMPLOYEE_READ',
        'EMPLOYEE_CREATE',
        'EMPLOYEE_UPDATE',
        'EMPLOYEE_DELETE',
        'EMPLOYEE_EXPORT',

        // Contract
        'CONTRACT_READ',
        'CONTRACT_CREATE',
        'CONTRACT_UPDATE',
        'CONTRACT_DELETE',
        'CONTRACT_TERMINATE',
        'CONTRACT_EXPORT',

        // Onboarding
        'ONBOARDING_PLAN_READ',
        'ONBOARDING_PLAN_CREATE',
        'ONBOARDING_PLAN_UPDATE',
        'ONBOARDING_PLAN_DELETE',
        'ONBOARDING_PROGRESS_READ',
        'ONBOARDING_PROGRESS_CREATE',
        'ONBOARDING_PROGRESS_COMPLETE',
        'ONBOARDING_PROGRESS_EXPORT',

        // Shift management
        'SHIFT_GROUP_READ',
        'SHIFT_GROUP_CREATE',
        'SHIFT_GROUP_UPDATE',
        'SHIFT_GROUP_DELETE',
        'SHIFT_READ',
        'SHIFT_CREATE',
        'SHIFT_UPDATE',
        'SHIFT_DELETE',
        'SHIFT_ASSIGN_READ',
        'SHIFT_ASSIGN_CREATE',
        'SHIFT_ASSIGN_UPDATE',
        'SHIFT_ASSIGN_DELETE',
        'SHIFT_SCHEDULE_READ',

        // Holiday management
        'HOLIDAY_READ',
        'HOLIDAY_CREATE',
        'HOLIDAY_UPDATE',
        'HOLIDAY_DELETE',
        'HOLIDAY_GROUP_READ',
        'HOLIDAY_GROUP_CREATE',
        'HOLIDAY_GROUP_UPDATE',
        'HOLIDAY_GROUP_DELETE',
        'HOLIDAY_CONFIG',
        'HOLIDAY_NOTIFICATION_SEND',

        // Overtime/Penalty rules
        'OVERTIME_RULE_READ',
        'OVERTIME_RULE_CREATE',
        'OVERTIME_RULE_UPDATE',
        'OVERTIME_RULE_DELETE',
        'PENALTY_READ',
        'PENALTY_CREATE',
        'PENALTY_UPDATE',
        'PENALTY_DELETE',

        // Attendance ops (không bao gồm cấu hình hệ thống mức Admin)
        'ATTENDANCE_FACE_DATA_READ',
        'ATTENDANCE_FACE_DATA_DELETE',

        // Timesheet/Payroll processing
        'TIMESHEET_READ',
        'TIMESHEET_CREATE',
        'TIMESHEET_UPDATE',
        'TIMESHEET_LOCK',
        'TIMESHEET_EXPORT',
        'PAYROLL_READ',
        'PAYROLL_CREATE',
        'PAYROLL_UPDATE',
        'PAYROLL_LOCK',
        'PAYROLL_EXPORT',
        'PAYROLL_SLIP_READ',
        'PAYROLL_SLIP_CREATE',
        'PAYROLL_TYPE_READ',
        'PAYROLL_TYPE_CREATE',
        'PAYROLL_TYPE_UPDATE',
        'PAYROLL_TYPE_DELETE',

        // Request configuration/data (HR quản trị nghiệp vụ request)
        'REQUEST_READ',
        'REQUEST_TYPE_READ',
        'REQUEST_TYPE_CREATE',
        'REQUEST_TYPE_UPDATE',
        'REQUEST_TYPE_DELETE',
        'REQUEST_TYPE_POLICY_CONFIG',
        'REQUEST_GROUP_READ',
        'REQUEST_GROUP_CREATE',
        'REQUEST_GROUP_UPDATE',
        'REQUEST_GROUP_DELETE',
        'REQUEST_GROUP_APPROVAL_CONFIG',

        // Department: xem cơ cấu để thao tác HR (quản trị cơ cấu thuộc Admin)
        'DEPARTMENT_READ',

        // Notifications
        'SEND_MANUAL_NOTIFICATION',
        'VIEW_NOTIFICATION_HISTORY',
      ];
      const hrMappings = permissions
        .filter((p) => hrPermissions.includes(p.permissionCode))
        .map((p) =>
          rolePermissionRepo.create({
            roleId: roleMap['HR'].id,
            permissionId: p.id,
          }),
        );
      await rolePermissionRepo.save(hrMappings);
      console.log(`✓ Mapped ${hrMappings.length} permissions to HR role`);
    }

    // Mapping EMPLOYEE (Nhân viên thường)
    if (roleMap['EMPLOYEE']) {
      const employeePermissions = [
        'ATTENDANCE_READ_OWN',
        'ATTENDANCE_RECORD',
        'ATTENDANCE_FACE_DATA_READ_OWN',
        'ATTENDANCE_FACE_DATA_REGISTER',
        'PAYROLL_SLIP_READ',
        'REQUEST_READ_OWN',
        'REQUEST_CREATE',
        'REQUEST_TYPE_READ',
        'SHIFT_READ_OWN',
        'TIMESHEET_READ_OWN',
        'HOLIDAY_READ_OWN',
        'OVERTIME_RULE_READ_OWN',
        'PENALTY_READ_OWN',
        'ONBOARDING_PROGRESS_READ_OWN',
        'ONBOARDING_PROGRESS_UPDATE_OWN',
      ];
      const employeeMappings = permissions
        .filter((p) => employeePermissions.includes(p.permissionCode))
        .map((p) =>
          rolePermissionRepo.create({
            roleId: roleMap['EMPLOYEE'].id,
            permissionId: p.id,
          }),
        );
      await rolePermissionRepo.save(employeeMappings);
      console.log(
        `✓ Mapped ${employeeMappings.length} permissions to EMPLOYEE role`,
      );
    }

    console.log('\n✅ Seed completed!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await dataSource.destroy();
  }
};

seed();

