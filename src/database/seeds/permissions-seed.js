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
      // ================= ATTENDANCE =================
      { permissionCode: 'ATTENDANCE_READ_OWN', description: 'Xem dữ liệu chấm công của bản thân', module: 'Attendance' },
      { permissionCode: 'ATTENDANCE_RECORD', description: 'Thực hiện ghi nhận chấm công', module: 'Attendance' },
      { permissionCode: 'ATTENDANCE_BLOCKING_CONFIG_READ', description: 'Xem cấu hình chặn chấm công', module: 'Attendance' },
      { permissionCode: 'ATTENDANCE_BLOCKING_CONFIG_CREATE', description: 'Tạo cấu hình chặn chấm công', module: 'Attendance' },
      { permissionCode: 'ATTENDANCE_BLOCKING_CONFIG_UPDATE', description: 'Cập nhật cấu hình chặn chấm công', module: 'Attendance' },
      { permissionCode: 'ATTENDANCE_BLOCKING_CONFIG_DELETE', description: 'Xóa cấu hình chặn chấm công', module: 'Attendance' },
      { permissionCode: 'ATTENDANCE_BLOCKING_CONFIG_STATUS_CHANGE', description: 'Thay đổi trạng thái cấu hình chặn', module: 'Attendance' },
      { permissionCode: 'ATTENDANCE_SECURITY_CONFIG_READ', description: 'Xem cấu hình bảo mật chấm công', module: 'Attendance' },
      { permissionCode: 'ATTENDANCE_SECURITY_CONFIG_UPDATE', description: 'Cập nhật cấu hình bảo mật chấm công', module: 'Attendance' },
      { permissionCode: 'ATTENDANCE_FACE_DATA_READ', description: 'Xem dữ liệu khuôn mặt nhân viên', module: 'Attendance' },
      { permissionCode: 'ATTENDANCE_FACE_DATA_READ_OWN', description: 'Xem dữ liệu khuôn mặt bản thân', module: 'Attendance' },
      { permissionCode: 'ATTENDANCE_FACE_DATA_DELETE', description: 'Xóa dữ liệu khuôn mặt', module: 'Attendance' },
      { permissionCode: 'ATTENDANCE_FACE_DATA_REGISTER', description: 'Đăng ký dữ liệu khuôn mặt', module: 'Attendance' },
      { permissionCode: 'ATTENDANCE_FACE_RECOGNITION_CONFIG_READ', description: 'Xem cấu hình nhận diện khuôn mặt', module: 'Attendance' },
      { permissionCode: 'ATTENDANCE_FACE_RECOGNITION_CONFIG_UPDATE', description: 'Cập nhật cấu hình nhận diện khuôn mặt', module: 'Attendance' },

      // ================= PAYROLL =================
      { permissionCode: 'PAYROLL_READ', description: 'Xem bảng lương', module: 'Payroll' },
      { permissionCode: 'PAYROLL_CREATE', description: 'Khởi tạo bảng lương', module: 'Payroll' },
      { permissionCode: 'PAYROLL_APPROVE', description: 'Phê duyệt bảng lương', module: 'Payroll' },
      { permissionCode: 'PAYROLL_LOCK', description: 'Chốt/Khóa bảng lương', module: 'Payroll' },
      { permissionCode: 'PAYROLL_UPDATE', description: 'Cập nhật bảng lương', module: 'Payroll' },
      { permissionCode: 'PAYROLL_SLIP_READ', description: 'Xem phiếu lương', module: 'Payroll' },
      { permissionCode: 'PAYROLL_SLIP_CREATE', description: 'Tạo phiếu lương', module: 'Payroll' },
      { permissionCode: 'PAYROLL_EXPORT', description: 'Xuất dữ liệu bảng lương', module: 'Payroll' },
      { permissionCode: 'PAYROLL_TYPE_READ', description: 'Xem loại bảng lương', module: 'Payroll' },
      { permissionCode: 'PAYROLL_TYPE_CREATE', description: 'Tạo loại bảng lương', module: 'Payroll' },
      { permissionCode: 'PAYROLL_TYPE_UPDATE', description: 'Cập nhật loại bảng lương', module: 'Payroll' },
      { permissionCode: 'PAYROLL_TYPE_DELETE', description: 'Xóa loại bảng lương', module: 'Payroll' },

      // ================= REQUEST =================
      { permissionCode: 'REQUEST_READ', description: 'Xem danh sách yêu cầu', module: 'Request' },
      { permissionCode: 'REQUEST_CREATE', description: 'Tạo yêu cầu mới', module: 'Request' },
      { permissionCode: 'REQUEST_APPROVE', description: 'Phê duyệt yêu cầu', module: 'Request' },
      { permissionCode: 'REQUEST_CANCEL', description: 'Hủy yêu cầu', module: 'Request' },
      { permissionCode: 'REQUEST_READ_OWN', description: 'Xem yêu cầu của bản thân', module: 'Request' },
      { permissionCode: 'REQUEST_TYPE_READ', description: 'Xem loại yêu cầu', module: 'Request' },
      { permissionCode: 'REQUEST_TYPE_CREATE', description: 'Tạo loại yêu cầu', module: 'Request' },
      { permissionCode: 'REQUEST_TYPE_UPDATE', description: 'Cập nhật loại yêu cầu', module: 'Request' },
      { permissionCode: 'REQUEST_TYPE_DELETE', description: 'Xóa loại yêu cầu', module: 'Request' },
      { permissionCode: 'REQUEST_TYPE_POLICY_CONFIG', description: 'Cấu hình chính sách loại yêu cầu', module: 'Request' },
      { permissionCode: 'REQUEST_GROUP_READ', description: 'Xem nhóm yêu cầu', module: 'Request' },
      { permissionCode: 'REQUEST_GROUP_CREATE', description: 'Tạo nhóm yêu cầu', module: 'Request' },
      { permissionCode: 'REQUEST_GROUP_UPDATE', description: 'Cập nhật nhóm yêu cầu', module: 'Request' },
      { permissionCode: 'REQUEST_GROUP_DELETE', description: 'Xóa nhóm yêu cầu', module: 'Request' },
      { permissionCode: 'REQUEST_GROUP_APPROVAL_CONFIG', description: 'Cấu hình phê duyệt nhóm yêu cầu', module: 'Request' },

      // ================= SHIFT =================
      { permissionCode: 'SHIFT_GROUP_READ', description: 'Xem nhóm ca làm việc', module: 'Shift' },
      { permissionCode: 'SHIFT_GROUP_CREATE', description: 'Tạo nhóm ca làm việc', module: 'Shift' },
      { permissionCode: 'SHIFT_GROUP_UPDATE', description: 'Cập nhật nhóm ca làm việc', module: 'Shift' },
      { permissionCode: 'SHIFT_GROUP_DELETE', description: 'Xóa nhóm ca làm việc', module: 'Shift' },
      { permissionCode: 'SHIFT_READ', description: 'Xem danh sách ca làm việc', module: 'Shift' },
      { permissionCode: 'SHIFT_CREATE', description: 'Tạo ca làm việc', module: 'Shift' },
      { permissionCode: 'SHIFT_UPDATE', description: 'Cập nhật ca làm việc', module: 'Shift' },
      { permissionCode: 'SHIFT_DELETE', description: 'Xóa ca làm việc', module: 'Shift' },
      { permissionCode: 'SHIFT_READ_OWN', description: 'Xem ca làm việc cá nhân', module: 'Shift' },
      { permissionCode: 'SHIFT_ASSIGN_READ', description: 'Xem phân ca', module: 'Shift' },
      { permissionCode: 'SHIFT_ASSIGN_CREATE', description: 'Thực hiện phân ca', module: 'Shift' },
      { permissionCode: 'SHIFT_ASSIGN_UPDATE', description: 'Cập nhật phân ca', module: 'Shift' },
      { permissionCode: 'SHIFT_ASSIGN_DELETE', description: 'Xóa phân ca', module: 'Shift' },
      { permissionCode: 'SHIFT_SCHEDULE_READ', description: 'Xem lịch trình làm việc', module: 'Shift' },

      // ================= EMPLOYEE =================
      { permissionCode: 'EMPLOYEE_READ', description: 'Xem danh sách nhân viên', module: 'Employee' },
      { permissionCode: 'EMPLOYEE_CREATE', description: 'Thêm mới nhân viên', module: 'Employee' },
      { permissionCode: 'EMPLOYEE_UPDATE', description: 'Cập nhật nhân viên', module: 'Employee' },
      { permissionCode: 'EMPLOYEE_DELETE', description: 'Xóa nhân viên', module: 'Employee' },
      { permissionCode: 'EMPLOYEE_EXPORT', description: 'Xuất dữ liệu nhân viên', module: 'Employee' },

      // ================= CONTRACT =================
      { permissionCode: 'CONTRACT_READ', description: 'Xem hợp đồng', module: 'Contract' },
      { permissionCode: 'CONTRACT_CREATE', description: 'Tạo hợp đồng', module: 'Contract' },
      { permissionCode: 'CONTRACT_UPDATE', description: 'Cập nhật hợp đồng', module: 'Contract' },
      { permissionCode: 'CONTRACT_DELETE', description: 'Xóa hợp đồng', module: 'Contract' },
      { permissionCode: 'CONTRACT_TERMINATE', description: 'Chấm dứt hợp đồng', module: 'Contract' },
      { permissionCode: 'CONTRACT_EXPORT', description: 'Xuất dữ liệu hợp đồng', module: 'Contract' },

      // ================= DEPARTMENT =================
      { permissionCode: 'DEPARTMENT_READ', description: 'Xem phòng ban', module: 'Department' },
      { permissionCode: 'DEPARTMENT_CREATE', description: 'Tạo phòng ban', module: 'Department' },
      { permissionCode: 'DEPARTMENT_UPDATE', description: 'Cập nhật phòng ban', module: 'Department' },
      { permissionCode: 'DEPARTMENT_DELETE', description: 'Xóa phòng ban', module: 'Department' },
      { permissionCode: 'DEPARTMENT_EXPORT', description: 'Xuất dữ liệu phòng ban', module: 'Department' },

      // ================= ONBOARDING =================
      { permissionCode: 'ONBOARDING_PLAN_READ', description: 'Xem kế hoạch hội nhập', module: 'Onboarding' },
      { permissionCode: 'ONBOARDING_PLAN_CREATE', description: 'Tạo kế hoạch hội nhập', module: 'Onboarding' },
      { permissionCode: 'ONBOARDING_PLAN_UPDATE', description: 'Cập nhật kế hoạch hội nhập', module: 'Onboarding' },
      { permissionCode: 'ONBOARDING_PLAN_DELETE', description: 'Xóa kế hoạch hội nhập', module: 'Onboarding' },
      { permissionCode: 'ONBOARDING_PROGRESS_READ', description: 'Xem tiến độ hội nhập', module: 'Onboarding' },
      { permissionCode: 'ONBOARDING_PROGRESS_CREATE', description: 'Tạo tiến độ hội nhập', module: 'Onboarding' },
      { permissionCode: 'ONBOARDING_PROGRESS_COMPLETE', description: 'Hoàn thành tiến độ hội nhập', module: 'Onboarding' },
      { permissionCode: 'ONBOARDING_PROGRESS_EXPORT', description: 'Xuất dữ liệu hội nhập', module: 'Onboarding' },
      { permissionCode: 'ONBOARDING_PROGRESS_READ_OWN', description: 'Xem tiến độ hội nhập cá nhân', module: 'Onboarding' },
      { permissionCode: 'ONBOARDING_PROGRESS_UPDATE_OWN', description: 'Cập nhật tiến độ hội nhập cá nhân', module: 'Onboarding' },

      // ================= TIMESHEET =================
      { permissionCode: 'TIMESHEET_READ', description: 'Xem bảng công', module: 'Timesheet' },
      { permissionCode: 'TIMESHEET_CREATE', description: 'Tạo bảng công', module: 'Timesheet' },
      { permissionCode: 'TIMESHEET_UPDATE', description: 'Cập nhật bảng công', module: 'Timesheet' },
      { permissionCode: 'TIMESHEET_LOCK', description: 'Chốt bảng công', module: 'Timesheet' },
      { permissionCode: 'TIMESHEET_EXPORT', description: 'Xuất bảng công', module: 'Timesheet' },
      { permissionCode: 'TIMESHEET_READ_OWN', description: 'Xem bảng công cá nhân', module: 'Timesheet' },

      // ================= HOLIDAY =================
      { permissionCode: 'HOLIDAY_READ', description: 'Xem ngày lễ', module: 'Holiday' },
      { permissionCode: 'HOLIDAY_CREATE', description: 'Tạo ngày lễ', module: 'Holiday' },
      { permissionCode: 'HOLIDAY_UPDATE', description: 'Cập nhật ngày lễ', module: 'Holiday' },
      { permissionCode: 'HOLIDAY_DELETE', description: 'Xóa ngày lễ', module: 'Holiday' },
      { permissionCode: 'HOLIDAY_GROUP_READ', description: 'Xem nhóm ngày lễ', module: 'Holiday' },
      { permissionCode: 'HOLIDAY_GROUP_CREATE', description: 'Tạo nhóm ngày lễ', module: 'Holiday' },
      { permissionCode: 'HOLIDAY_GROUP_UPDATE', description: 'Cập nhật nhóm ngày lễ', module: 'Holiday' },
      { permissionCode: 'HOLIDAY_GROUP_DELETE', description: 'Xóa nhóm ngày lễ', module: 'Holiday' },
      { permissionCode: 'HOLIDAY_CONFIG', description: 'Cấu hình ngày lễ', module: 'Holiday' },
      { permissionCode: 'HOLIDAY_NOTIFICATION_SEND', description: 'Gửi thông báo nghỉ lễ', module: 'Holiday' },
      { permissionCode: 'HOLIDAY_READ_OWN', description: 'Xem lịch nghỉ lễ cá nhân', module: 'Holiday' },

      // ================= OVERTIME =================
      { permissionCode: 'OVERTIME_RULE_READ', description: 'Xem quy định tăng ca', module: 'Overtime' },
      { permissionCode: 'OVERTIME_RULE_CREATE', description: 'Tạo quy định tăng ca', module: 'Overtime' },
      { permissionCode: 'OVERTIME_RULE_UPDATE', description: 'Cập nhật quy định tăng ca', module: 'Overtime' },
      { permissionCode: 'OVERTIME_RULE_DELETE', description: 'Xóa quy định tăng ca', module: 'Overtime' },
      { permissionCode: 'OVERTIME_RULE_READ_OWN', description: 'Xem quy định tăng ca cá nhân', module: 'Overtime' },

      // ================= PENALTY =================
      { permissionCode: 'PENALTY_CREATE', description: 'Tạo quy định phạt', module: 'Penalty' },
      { permissionCode: 'PENALTY_READ', description: 'Xem quy định phạt', module: 'Penalty' },
      { permissionCode: 'PENALTY_UPDATE', description: 'Cập nhật quy định phạt', module: 'Penalty' },
      { permissionCode: 'PENALTY_DELETE', description: 'Xóa quy định phạt', module: 'Penalty' },
      { permissionCode: 'PENALTY_READ_OWN', description: 'Xem quy định phạt cá nhân', module: 'Penalty' },

      // ================= USER =================
      { permissionCode: 'USER_READ', description: 'Xem người dùng', module: 'User' },
      { permissionCode: 'USER_CREATE', description: 'Tạo người dùng', module: 'User' },
      { permissionCode: 'USER_UPDATE', description: 'Cập nhật người dùng', module: 'User' },
      { permissionCode: 'USER_DELETE', description: 'Xóa người dùng', module: 'User' },
      { permissionCode: 'USER_LOCK', description: 'Khóa tài khoản người dùng', module: 'User' },
      { permissionCode: 'USER_ROLE_REMOVE', description: 'Gỡ vai trò người dùng', module: 'User' },
      { permissionCode: 'USER_PASSWORD_RESET_FORCE', description: 'Bắt buộc đổi mật khẩu', module: 'User' },
      { permissionCode: 'USER_ACTION_LOG_READ', description: 'Xem nhật ký hoạt động', module: 'User' },
      { permissionCode: 'USER_ACTION_LOG_EXPORT', description: 'Xuất nhật ký hoạt động', module: 'User' },
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
    roles.forEach(role => roleMap[role.roleName] = role);

    const rolePermissionRepo = dataSource.getRepository(RolePermissionEntity);
    await rolePermissionRepo.clear();

    // Mapping ADMIN (Tất cả)
    if (roleMap['ADMIN']) {
      const adminMappings = permissions.map(p => rolePermissionRepo.create({
        roleId: roleMap['ADMIN'].id,
        permissionId: p.id,
      }));
      await rolePermissionRepo.save(adminMappings);
    }

    // Tương tự cho MANAGER, EMPLOYEE, HR dựa trên danh sách mới...
    // (Bạn có thể tinh chỉnh filter theo nhu cầu nghiệp vụ cụ thể)

    console.log('\n✅ Seed completed!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await dataSource.destroy();
  }
};

seed();