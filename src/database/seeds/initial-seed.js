import { Between, DataSource } from 'typeorm';
import { hashPassword } from '../../common/utils/index.js';
import { databaseConfig } from '../../config/database.config.js';
import { AttendanceRecordEntity } from '../../models/entities/attendance-record.entity.js';
import { ActionLogEntity } from '../../models/entities/action-log.entity.js';
import { AICriteriaEntity } from '../../models/entities/ai-criteria.entity.js';
import { AIEvaluationResultEntity } from '../../models/entities/ai-evaluation-result.entity.js';
import { ContractEntity } from '../../models/entities/contract.entity.js';
import { DepartmentEntity } from '../../models/entities/department.entity.js';
import { EmployeeBankAccountEntity } from '../../models/entities/employee-bank-account.entity.js';
import { EmployeeDependentEntity } from '../../models/entities/employee-dependent.entity.js';
import { EmployeeEducationEntity } from '../../models/entities/employee-education.entity.js';
import { EmployeeEmergencyContactEntity } from '../../models/entities/employee-emergency-contact.entity.js';
import { EmployeeSalaryEntity } from '../../models/entities/employee-salary.entity.js';
import { EmployeeWorkHistoryEntity } from '../../models/entities/employee-work-history.entity.js';
import { EmployeeEntity } from '../../models/entities/employee.entity.js';
import { FaceDataEntity } from '../../models/entities/face-data.entity.js';
import { FaceRecognitionConfigEntity } from '../../models/entities/face-recognition-config.entity.js';
import { LeaveBalanceEntity } from '../../models/entities/leave-balance.entity.js';
import { LeavePolicyEntity } from '../../models/entities/leave-policy.entity.js';
import { LeaveTypeEntity } from '../../models/entities/leave-type.entity.js';
import { NotificationRecipientEntity } from '../../models/entities/notification-recipient.entity.js';
import { NotificationEntity } from '../../models/entities/notification.entity.js';
import { OnboardingPlanEntity } from '../../models/entities/onboarding-plan.entity.js';
import { OnboardingProgressEntity } from '../../models/entities/onboarding-progress.entity.js';
import { OnboardingTaskEntity } from '../../models/entities/onboarding-task.entity.js';
import { HolidayConfigEntity } from '../../models/entities/holiday-config.entity.js';
import { HolidayGroupEntity } from '../../models/entities/holiday-group.entity.js';
import { HolidayListEntity } from '../../models/entities/holiday-list.entity.js';
import { JobGradeEntity } from '../../models/entities/job-grade.entity.js';
import { OvertimeRequestDetailEntity } from '../../models/entities/overtime-request-detail.entity.js';
import { OvertimeRuleDepartmentEntity } from '../../models/entities/overtime-rule-department.entity.js';
import { OvertimeRuleEntity } from '../../models/entities/overtime-rule.entity.js';
import { OvertimeTypeEntity } from '../../models/entities/overtime-type.entity.js';
import { PayrollDetailEntity } from '../../models/entities/payroll-detail.entity.js';
import { PayrollEntity } from '../../models/entities/payroll.entity.js';
import { PayrollTypeEntity } from '../../models/entities/payroll-type.entity.js';
import { PenaltyEntity } from '../../models/entities/penalty.entity.js';
import { PermissionEntity } from '../../models/entities/permission.entity.js';
import { PositionEntity } from '../../models/entities/position.entity.js';
import { RequestEntity } from '../../models/entities/request.entity.js';
import { RolePermissionEntity } from '../../models/entities/role-permission.entity.js';
import { RoleEntity } from '../../models/entities/role.entity.js';
import { ShiftAssignmentEntity } from '../../models/entities/shift-assignment.entity.js';
import { ShiftGroupEntity } from '../../models/entities/shift-group.entity.js';
import { UserRoleEntity } from '../../models/entities/user-role.entity.js';
import { UserEntity } from '../../models/entities/user.entity.js';
import { WorkingShiftEntity } from '../../models/entities/working-shift.entity.js';
import { ShiftScheduleEntity } from '../../models/entities/shift-schedule.entity.js';
import { TaskAssignmentEntity } from '../../models/entities/task-assignment.entity.js';
import { TimeSheetEntity } from '../../models/entities/time-sheet.entity.js';

const seed = async () => {
  const dataSource = new DataSource(databaseConfig);
  await dataSource.initialize();

  try {
    console.log('Seeding data...');

    // 1. Create Permissions
    const permissionsData = [
      { permissionCode: 'USER_READ', description: 'Read users' },
      { permissionCode: 'USER_WRITE', description: 'Create/Update users' },
      { permissionCode: 'USER_DELETE', description: 'Delete users' },
      { permissionCode: 'ROLE_READ', description: 'Read roles' },
      { permissionCode: 'ROLE_WRITE', description: 'Create/Update roles' },
      { permissionCode: 'DEPT_READ', description: 'Read departments' },
      { permissionCode: 'DEPT_CREATE', description: 'Create departments' },
      { permissionCode: 'DEPT_UPDATE', description: 'Update departments' },
      { permissionCode: 'DEPT_DELETE', description: 'Delete departments' },
      { permissionCode: 'DEPT_EXPORT', description: 'Export departments' },
      { permissionCode: 'EMPLOYEE_READ', description: 'View employees' },
      { permissionCode: 'EMPLOYEE_CREATE', description: 'Create employees' },
      { permissionCode: 'EMPLOYEE_UPDATE', description: 'Update employees' },
      { permissionCode: 'EMPLOYEE_DELETE', description: 'Delete employees' },
      { permissionCode: 'EMPLOYEE_EXPORT', description: 'Export employees' },
      { permissionCode: 'TIMESHEET_READ', description: 'View timesheets' },
      {
        permissionCode: 'TIMESHEET_CREATE',
        description: 'Generate timesheets',
      },
      { permissionCode: 'TIMESHEET_UPDATE', description: 'Edit timesheets' },
      {
        permissionCode: 'TIMESHEET_LOCK',
        description: 'Lock/Unlock timesheets',
      },
      { permissionCode: 'TIMESHEET_EXPORT', description: 'Export timesheets' },
      {
        permissionCode: 'HOLIDAY_READ',
        description: 'View holiday list',
        module: 'Holiday',
      },
      {
        permissionCode: 'HOLIDAY_CREATE',
        description: 'Create holiday',
        module: 'Holiday',
      },
      {
        permissionCode: 'HOLIDAY_UPDATE',
        description: 'Update holiday',
        module: 'Holiday',
      },
      {
        permissionCode: 'HOLIDAY_DELETE',
        description: 'Delete holiday',
        module: 'Holiday',
      },
      {
        permissionCode: 'HOLIDAY_EXPORT',
        description: 'Export holidays',
        module: 'Holiday',
      },

      // Contracts
      {
        permissionCode: 'CONTRACT_READ',
        description: 'View contracts',
        module: 'Contract',
      },
      {
        permissionCode: 'CONTRACT_CREATE',
        description: 'Create contract',
        module: 'Contract',
      },
      {
        permissionCode: 'CONTRACT_UPDATE',
        description: 'Update contract',
        module: 'Contract',
      },
      {
        permissionCode: 'CONTRACT_DELETE',
        description: 'Delete contract',
        module: 'Contract',
      },
      {
        permissionCode: 'CONTRACT_EXPORT',
        description: 'Export contracts',
        module: 'Contract',
      },

      // Positions
      {
        permissionCode: 'POSITION_READ',
        description: 'View positions',
        module: 'Position',
      },
      {
        permissionCode: 'POSITION_CREATE',
        description: 'Create position',
        module: 'Position',
      },
      {
        permissionCode: 'POSITION_UPDATE',
        description: 'Update position',
        module: 'Position',
      },
      {
        permissionCode: 'POSITION_DELETE',
        description: 'Delete position',
        module: 'Position',
      },
      {
        permissionCode: 'POSITION_EXPORT',
        description: 'Export positions',
        module: 'Position',
      },

      // Job Grades
      {
        permissionCode: 'JOB_GRADE_READ',
        description: 'View job grades',
        module: 'JobGrade',
      },
      {
        permissionCode: 'JOB_GRADE_CREATE',
        description: 'Create job grade',
        module: 'JobGrade',
      },
      {
        permissionCode: 'JOB_GRADE_UPDATE',
        description: 'Update job grade',
        module: 'JobGrade',
      },
      {
        permissionCode: 'JOB_GRADE_DELETE',
        description: 'Delete job grade',
        module: 'JobGrade',
      },
      {
        permissionCode: 'JOB_GRADE_EXPORT',
        description: 'Export job grades',
        module: 'JobGrade',
      },

      // Onboarding permissions
      {
        permissionCode: 'ONBOARDING_PLAN_READ',
        description: 'View onboarding plans',
        module: 'Onboarding',
      },
      {
        permissionCode: 'ONBOARDING_PLAN_CREATE',
        description: 'Create onboarding plan',
        module: 'Onboarding',
      },
      {
        permissionCode: 'ONBOARDING_PLAN_UPDATE',
        description: 'Update onboarding plan',
        module: 'Onboarding',
      },
      {
        permissionCode: 'ONBOARDING_PLAN_DELETE',
        description: 'Delete onboarding plan',
        module: 'Onboarding',
      },
      {
        permissionCode: 'ONBOARDING_PLAN_EXPORT',
        description: 'Export onboarding plans',
        module: 'Onboarding',
      },
      {
        permissionCode: 'ONBOARDING_PROGRESS_READ',
        description: 'View onboarding progress',
        module: 'Onboarding',
      },
      {
        permissionCode: 'ONBOARDING_PROGRESS_UPDATE',
        description: 'Update onboarding progress',
        module: 'Onboarding',
      },
      {
        permissionCode: 'ONBOARDING_TASK_READ',
        description: 'View onboarding tasks',
        module: 'Onboarding',
      },
      {
        permissionCode: 'ONBOARDING_TASK_CREATE',
        description: 'Create onboarding task',
        module: 'Onboarding',
      },
      {
        permissionCode: 'ONBOARDING_TASK_UPDATE',
        description: 'Update onboarding task',
        module: 'Onboarding',
      },
      {
        permissionCode: 'ONBOARDING_TASK_DELETE',
        description: 'Delete onboarding task',
        module: 'Onboarding',
      },

      // Employee Salaries
      {
        permissionCode: 'EMPLOYEE_SALARY_READ',
        description: 'View employee salaries',
        module: 'Salary',
      },
      {
        permissionCode: 'EMPLOYEE_SALARY_CREATE',
        description: 'Create employee salary',
        module: 'Salary',
      },
      {
        permissionCode: 'EMPLOYEE_SALARY_UPDATE',
        description: 'Update employee salary',
        module: 'Salary',
      },
      {
        permissionCode: 'EMPLOYEE_SALARY_DELETE',
        description: 'Delete employee salary',
        module: 'Salary',
      },
      {
        permissionCode: 'EMPLOYEE_SALARY_EXPORT',
        description: 'Export employee salaries',
        module: 'Salary',
      },

      // Shift management
      {
        permissionCode: 'SHIFT_GROUP_READ',
        description: 'View shift groups',
        module: 'Shift',
      },
      {
        permissionCode: 'SHIFT_GROUP_CREATE',
        description: 'Create shift group',
        module: 'Shift',
      },
      {
        permissionCode: 'SHIFT_GROUP_UPDATE',
        description: 'Update shift group',
        module: 'Shift',
      },
      {
        permissionCode: 'SHIFT_GROUP_DELETE',
        description: 'Delete shift group',
        module: 'Shift',
      },
      {
        permissionCode: 'SHIFT_READ',
        description: 'View working shifts',
        module: 'Shift',
      },
      {
        permissionCode: 'SHIFT_CREATE',
        description: 'Create working shift',
        module: 'Shift',
      },
      {
        permissionCode: 'SHIFT_UPDATE',
        description: 'Update working shift',
        module: 'Shift',
      },
      {
        permissionCode: 'SHIFT_DELETE',
        description: 'Delete working shift',
        module: 'Shift',
      },
      {
        permissionCode: 'SHIFT_ASSIGN_READ',
        description: 'View shift assignments',
        module: 'Shift',
      },
      {
        permissionCode: 'SHIFT_ASSIGN_CREATE',
        description: 'Assign shifts',
        module: 'Shift',
      },
      {
        permissionCode: 'SHIFT_ASSIGN_UPDATE',
        description: 'Update shift assignment',
        module: 'Shift',
      },
      {
        permissionCode: 'SHIFT_ASSIGN_DELETE',
        description: 'Cancel shift assignment',
        module: 'Shift',
      },
      {
        permissionCode: 'SHIFT_SCHEDULE_READ',
        description: 'View shift schedules',
        module: 'Shift',
      },
      // Payroll
      {
        permissionCode: 'PAYROLL_READ',
        description: 'View payroll list and details',
        module: 'Payroll',
      },
      {
        permissionCode: 'PAYROLL_CREATE',
        description: 'Create new payroll period',
        module: 'Payroll',
      },
      {
        permissionCode: 'PAYROLL_UPDATE',
        description: 'Update payroll details and auto-calculate',
        module: 'Payroll',
      },
      {
        permissionCode: 'PAYROLL_APPROVE',
        description: 'Submit, Approve, or Reject payroll',
        module: 'Payroll',
      },
      {
        permissionCode: 'PAYROLL_LOCK',
        description: 'Lock payroll and send payslips',
        module: 'Payroll',
      },
      {
        permissionCode: 'PAYROLL_EXPORT',
        description: 'Export payroll summary or payslips',
        module: 'Payroll',
      },
      // Payroll Type
      {
        permissionCode: 'PAYROLL_TYPE_READ',
        description: 'View payroll type list',
        module: 'PayrollType',
      },
      {
        permissionCode: 'PAYROLL_TYPE_CREATE',
        description: 'Create new payroll type',
        module: 'PayrollType',
      },
      {
        permissionCode: 'PAYROLL_TYPE_UPDATE',
        description: 'Update payroll type',
        module: 'PayrollType',
      },
      {
        permissionCode: 'PAYROLL_TYPE_DELETE',
        description: 'Delete payroll type',
        module: 'PayrollType',
      },
      // Overtime Rules
      {
        permissionCode: 'OVERTIME_RULE_READ',
        description: 'View overtime rules',
        module: 'Overtime',
      },
      {
        permissionCode: 'OVERTIME_RULE_CREATE',
        description: 'Create overtime rule',
        module: 'Overtime',
      },
      {
        permissionCode: 'OVERTIME_RULE_UPDATE',
        description: 'Update overtime rule',
        module: 'Overtime',
      },
      {
        permissionCode: 'OVERTIME_RULE_DELETE',
        description: 'Delete overtime rule',
        module: 'Overtime',
      },
      // Penalties
      {
        permissionCode: 'PENALTY_READ',
        description: 'View penalties',
        module: 'Penalty',
      },
      {
        permissionCode: 'PENALTY_CREATE',
        description: 'Create penalty',
        module: 'Penalty',
      },
      {
        permissionCode: 'PENALTY_UPDATE',
        description: 'Update penalty',
        module: 'Penalty',
      },
      {
        permissionCode: 'PENALTY_DELETE',
        description: 'Delete penalty',
        module: 'Penalty',
      },
      // Request Configuration
      {
        permissionCode: 'REQUEST_GROUP_READ',
        description: 'View request groups',
        module: 'RequestConfig',
      },
      {
        permissionCode: 'REQUEST_GROUP_CREATE',
        description: 'Create request group',
        module: 'RequestConfig',
      },
      {
        permissionCode: 'REQUEST_GROUP_UPDATE',
        description: 'Update request group',
        module: 'RequestConfig',
      },
      {
        permissionCode: 'REQUEST_GROUP_DELETE',
        description: 'Delete request group',
        module: 'RequestConfig',
      },
      {
        permissionCode: 'REQUEST_TYPE_READ',
        description: 'View request types',
        module: 'RequestConfig',
      },
      {
        permissionCode: 'REQUEST_TYPE_CREATE',
        description: 'Create request type',
        module: 'RequestConfig',
      },
      {
        permissionCode: 'REQUEST_TYPE_UPDATE',
        description: 'Update request type',
        module: 'RequestConfig',
      },
      {
        permissionCode: 'REQUEST_TYPE_DELETE',
        description: 'Delete request type',
        module: 'RequestConfig',
      },
      // Request Execution (Tạo / Duyệt Đơn Từ)
      {
        permissionCode: 'REQUEST_READ',
        description: 'View own requests',
        module: 'Request',
      },
      {
        permissionCode: 'REQUEST_CREATE',
        description: 'Create request for self',
        module: 'Request',
      },
      {
        permissionCode: 'REQUEST_CREATE_FOR_OTHERS',
        description: 'Create request on behalf of others',
        module: 'Request',
      },
      {
        permissionCode: 'REQUEST_SUBMIT',
        description: 'Submit request for approval',
        module: 'Request',
      },
      {
        permissionCode: 'REQUEST_CANCEL',
        description: 'Cancel own request (before any level approved)',
        module: 'Request',
      },
      {
        permissionCode: 'REQUEST_APPROVE',
        description: 'Approve or reject a pending request',
        module: 'Request',
      },
      {
        permissionCode: 'REQUEST_REVOKE',
        description: 'Revoke an already-approved level (undo approval)',
        module: 'Request',
      },
      {
        permissionCode: 'REQUEST_VIEW_ALL',
        description: 'View all requests regardless of ownership',
        module: 'Request',
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
        console.log(`Created permission: ${p.permissionCode}`);
      }
      permissions.push(permission);
    }

    // 2. Create Roles
    const rolesData = [
      { roleName: 'ADMIN', description: 'Administrator' },
      { roleName: 'MANAGER', description: 'Manager' },
      { roleName: 'EMPLOYEE', description: 'Regular Employee' },
      { roleName: 'HR', description: 'Human Resources' },
    ];

    const roleRepo = dataSource.getRepository(RoleEntity);
    const roles = {};

    for (const r of rolesData) {
      let role = await roleRepo.findOne({ where: { roleName: r.roleName } });
      if (!role) {
        role = roleRepo.create(r);
        await roleRepo.save(role);
        console.log(`Created role: ${r.roleName}`);
      }
      roles[r.roleName] = role;
    }

    // 3. Assign Permissions to Roles
    const rolePermissionRepo = dataSource.getRepository(RolePermissionEntity);

    // Admin gets all permissions
    for (const p of permissions) {
      const exists = await rolePermissionRepo.findOne({
        where: { roleId: roles['ADMIN'].id, permissionId: p.id },
      });
      if (!exists) {
        const rp = rolePermissionRepo.create({
          roleId: roles['ADMIN'].id,
          permissionId: p.id,
        });
        await rolePermissionRepo.save(rp);
      }
    }
    console.log('Assigned permissions to ADMIN');

    // MANAGER gets DEPT_READ, EMPLOYEE_READ, HOLIDAY_READ, POSITION_READ, JOB_GRADE_READ
    const managerPerms = [
      'DEPT_READ',
      'EMPLOYEE_READ',
      'HOLIDAY_READ',
      'POSITION_READ',
      'JOB_GRADE_READ',
      'TIMESHEET_READ',
      'SHIFT_GROUP_READ',
      'SHIFT_READ',
      'SHIFT_ASSIGN_READ',
      'SHIFT_SCHEDULE_READ',
      'REQUEST_GROUP_READ',
      'REQUEST_TYPE_READ',
      // allow managers to view onboarding data
      'ONBOARDING_PLAN_READ',
      'ONBOARDING_PROGRESS_READ',
      'ONBOARDING_TASK_READ',
      // Request Execution — Manager là người duyệt cấp 1
      'REQUEST_READ',
      'REQUEST_CREATE',
      'REQUEST_SUBMIT',
      'REQUEST_CANCEL',
      'REQUEST_APPROVE',
      'REQUEST_REVOKE',
    ];
    for (const code of managerPerms) {
      const p = permissions.find((perm) => perm.permissionCode === code);
      if (p) {
        const exists = await rolePermissionRepo.findOne({
          where: { roleId: roles['MANAGER'].id, permissionId: p.id },
        });
        if (!exists) {
          await rolePermissionRepo.save(
            rolePermissionRepo.create({
              roleId: roles['MANAGER'].id,
              permissionId: p.id,
            }),
          );
        }
      }
    }
    console.log('Assigned permissions to MANAGER');

    // HR gets DEPT_READ, DEPT_CREATE, DEPT_UPDATE, DEPT_EXPORT, Employee.*, Holiday.*, Contract.*, Position.*, JobGrade.*, Salary.*
    const hrPerms = [
      'DEPT_READ',
      'DEPT_CREATE',
      'DEPT_UPDATE',
      'DEPT_EXPORT',
      'EMPLOYEE_READ',
      'EMPLOYEE_CREATE',
      'EMPLOYEE_UPDATE',
      'EMPLOYEE_DELETE',
      'EMPLOYEE_EXPORT',
      'TIMESHEET_READ',
      'TIMESHEET_CREATE',
      'TIMESHEET_UPDATE',
      'TIMESHEET_LOCK',
      'TIMESHEET_EXPORT',
      'HOLIDAY_READ',
      'HOLIDAY_CREATE',
      'HOLIDAY_UPDATE',
      'HOLIDAY_DELETE',
      'HOLIDAY_EXPORT',
      'CONTRACT_READ',
      'CONTRACT_CREATE',
      'CONTRACT_UPDATE',
      'CONTRACT_DELETE',
      'CONTRACT_EXPORT',
      'POSITION_READ',
      'POSITION_CREATE',
      'POSITION_UPDATE',
      'POSITION_DELETE',
      'POSITION_EXPORT',
      'JOB_GRADE_READ',
      'JOB_GRADE_CREATE',
      'JOB_GRADE_UPDATE',
      'JOB_GRADE_DELETE',
      'JOB_GRADE_EXPORT',
      'EMPLOYEE_SALARY_READ',
      'EMPLOYEE_SALARY_CREATE',
      'EMPLOYEE_SALARY_UPDATE',
      'EMPLOYEE_SALARY_DELETE',
      'EMPLOYEE_SALARY_EXPORT',
      // shift-related for HR
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
      // Payroll
      'PAYROLL_READ',
      'PAYROLL_CREATE',
      'PAYROLL_UPDATE',
      'PAYROLL_APPROVE',
      'PAYROLL_LOCK',
      'PAYROLL_EXPORT',
      // Payroll Type
      'PAYROLL_TYPE_READ',
      'PAYROLL_TYPE_CREATE',
      'PAYROLL_TYPE_UPDATE',
      'PAYROLL_TYPE_DELETE',
      // onboarding-related for HR
      'ONBOARDING_PLAN_READ',
      'ONBOARDING_PLAN_CREATE',
      'ONBOARDING_PLAN_UPDATE',
      'ONBOARDING_PLAN_DELETE',
      'ONBOARDING_PLAN_EXPORT',
      'ONBOARDING_PROGRESS_READ',
      'ONBOARDING_PROGRESS_UPDATE',
      'ONBOARDING_TASK_READ',
      'ONBOARDING_TASK_CREATE',
      'ONBOARDING_TASK_UPDATE',
      'ONBOARDING_TASK_DELETE',
      // Overtime Rules & Penalties
      'OVERTIME_RULE_READ',
      'OVERTIME_RULE_CREATE',
      'OVERTIME_RULE_UPDATE',
      'OVERTIME_RULE_DELETE',
      'PENALTY_READ',
      'PENALTY_CREATE',
      'PENALTY_UPDATE',
      'PENALTY_DELETE',
      // Request Config
      'REQUEST_GROUP_READ',
      'REQUEST_GROUP_CREATE',
      'REQUEST_GROUP_UPDATE',
      'REQUEST_GROUP_DELETE',
      'REQUEST_TYPE_READ',
      'REQUEST_TYPE_CREATE',
      'REQUEST_TYPE_UPDATE',
      'REQUEST_TYPE_DELETE',
      // Request Execution — HR có toàn quyền tạo/duyệt/xem tất cả
      'REQUEST_READ',
      'REQUEST_CREATE',
      'REQUEST_CREATE_FOR_OTHERS',
      'REQUEST_SUBMIT',
      'REQUEST_CANCEL',
      'REQUEST_APPROVE',
      'REQUEST_REVOKE',
      'REQUEST_VIEW_ALL',
    ];
    for (const code of hrPerms) {
      const p = permissions.find((perm) => perm.permissionCode === code);
      if (p) {
        const exists = await rolePermissionRepo.findOne({
          where: { roleId: roles['HR'].id, permissionId: p.id },
        });
        if (!exists) {
          await rolePermissionRepo.save(
            rolePermissionRepo.create({
              roleId: roles['HR'].id,
              permissionId: p.id,
            }),
          );
        }
      }
    }
    console.log('Assigned permissions to HR');

    // EMPLOYEE gets TIMESHEET_READ, DEPT_READ, HOLIDAY_READ, OVERTIME_RULE_READ, PENALTY_READ
    const employeePerms = [
      'TIMESHEET_READ',
      'DEPT_READ',
      'HOLIDAY_READ',
      'OVERTIME_RULE_READ',
      'PENALTY_READ',
      'REQUEST_GROUP_READ',
      'REQUEST_TYPE_READ',
      // Request Execution — Employee tạo và gửi đơn cho bản thân
      'REQUEST_READ',
      'REQUEST_CREATE',
      'REQUEST_SUBMIT',
      'REQUEST_CANCEL',
    ];
    for (const code of employeePerms) {
      const p = permissions.find((perm) => perm.permissionCode === code);
      if (p) {
        const exists = await rolePermissionRepo.findOne({
          where: { roleId: roles['EMPLOYEE'].id, permissionId: p.id },
        });
        if (!exists) {
          await rolePermissionRepo.save(
            rolePermissionRepo.create({
              roleId: roles['EMPLOYEE'].id,
              permissionId: p.id,
            }),
          );
        }
      }
    }
    console.log('Assigned permissions to EMPLOYEE');

    // 4. Create Departments
    const departmentRepo = dataSource.getRepository(DepartmentEntity);
    const departmentsData = [
      { departmentName: 'Software Development' },
      { departmentName: 'Human Resources' },
      { departmentName: 'Finance' },
      { departmentName: 'Marketing' },
    ];

    const departments = {};
    for (const d of departmentsData) {
      let dept = await departmentRepo.findOne({
        where: { departmentName: d.departmentName },
      });
      if (!dept) {
        dept = departmentRepo.create(d);
        await departmentRepo.save(dept);
        console.log(`Created department: ${d.departmentName}`);
      }
      departments[d.departmentName] = dept;
    }

    // 5. Create Positions
    const positionRepo = dataSource.getRepository(PositionEntity);
    const positionsData = [
      { positionName: 'Frontend Developer' },
      { positionName: 'Backend Developer' },
      { positionName: 'Mobile Developer' },
      { positionName: 'HR Specialist' },
      { positionName: 'HR Manager' },
      { positionName: 'Accountant' },
      { positionName: 'Finance Manager' },
      { positionName: 'Marketing Specialist' },
    ];

    for (const p of positionsData) {
      let pos = await positionRepo.findOne({
        where: { positionName: p.positionName },
      });
      if (!pos) {
        pos = positionRepo.create(p);
        await positionRepo.save(pos);
        console.log(`Created position: ${p.positionName}`);
      }
    }

    // 6. Create Job Grades
    const jobGradeRepo = dataSource.getRepository(JobGradeEntity);
    const jobGradesData = [
      {
        gradeName: 'Junior',
        departmentName: 'Software Development',
        minSalary: 6000000,
        maxSalary: 10000000,
      },
      {
        gradeName: 'Senior',
        departmentName: 'Software Development',
        minSalary: 19000000,
        maxSalary: 30000000,
      },
      {
        gradeName: 'Lead',
        departmentName: 'Software Development',
        minSalary: 31000000,
        maxSalary: 45000000,
      },
      {
        gradeName: 'Junior',
        departmentName: 'Human Resources',
        minSalary: 6000000,
        maxSalary: 10000000,
      },
      {
        gradeName: 'Senior',
        departmentName: 'Human Resources',
        minSalary: 19000000,
        maxSalary: 30000000,
      },
    ];

    for (const j of jobGradesData) {
      let grade = await jobGradeRepo.findOne({
        where: {
          gradeName: j.gradeName,
          departmentId: departments[j.departmentName].id,
        },
      });
      if (!grade) {
        grade = jobGradeRepo.create({
          gradeName: j.gradeName,
          departmentId: departments[j.departmentName].id,
          minSalary: j.minSalary,
          maxSalary: j.maxSalary,
        });
        await jobGradeRepo.save(grade);
        console.log(
          `Created job grade: ${j.gradeName} for ${j.departmentName}`,
        );
      }
    }

    // 7. Create Users and Employees
    const userRepo = dataSource.getRepository(UserEntity);
    const userRoleRepo = dataSource.getRepository(UserRoleEntity);
    const employeeRepo = dataSource.getRepository(EmployeeEntity);
    const password = await hashPassword('Password@123');

    const usersData = [
      {
        username: 'admin',
        email: 'admin@example.com',
        role: 'ADMIN',
        fullName: 'System Administrator',
        employeeCode: 'EMP001',
      },
      {
        username: 'manager',
        email: 'manager@example.com',
        role: 'MANAGER',
        fullName: 'John Manager',
        employeeCode: 'EMP002',
      },
      {
        username: 'employee',
        email: 'employee@example.com',
        role: 'EMPLOYEE',
        fullName: 'Jane Employee',
        employeeCode: 'EMP003',
      },
      {
        username: 'hr',
        email: 'hr@example.com',
        role: 'HR',
        fullName: 'Alice HR',
        employeeCode: 'EMP004',
      },
    ];

    for (const u of usersData) {
      let user = await userRepo.findOne({
        where: { username: u.username },
        withDeleted: true,
      });

      if (!user) {
        user = await userRepo.findOne({
          where: { email: u.email },
          withDeleted: true,
        });
      }

      if (!user) {
        user = userRepo.create({
          username: u.username,
          email: u.email,
          password: password,
          status: 'ACTIVE',
        });
        await userRepo.save(user);
        console.log(`Created user: ${u.username}`);

        const userRole = userRoleRepo.create({
          userId: user.id,
          roleId: roles[u.role].id,
        });
        await userRoleRepo.save(userRole);
        console.log(`Assigned role ${u.role} to ${u.username}`);
      } else if (user.isDeleted) {
        user.isDeleted = false;
        user.deletedAt = null;
        await userRepo.save(user);
        console.log(`Restored soft-deleted user: ${u.username}`);
      }

      let employee = await employeeRepo.findOne({ where: { userId: user.id } });
      if (!employee) {
        employee = employeeRepo.create({
          userId: user.id,
          fullName: u.fullName,
          employeeCode: u.employeeCode,
          companyEmail: u.email,
          departmentId:
            u.role === 'HR'
              ? departments['Human Resources'].id
              : u.role === 'MANAGER'
                ? departments['Software Development'].id
                : departments['Software Development'].id,
          employmentStatus: 'ACTIVE',
        });
        await employeeRepo.save(employee);
        console.log(`Created employee record for: ${u.fullName}`);
      } else {
        // Update existing employee with code if missing or changed
        employee.employeeCode = u.employeeCode;
        employee.fullName = u.fullName;
        employee.companyEmail = u.email;
        await employeeRepo.save(employee);
        console.log(`Updated employee record for: ${u.fullName}`);
      }
    }

    // ──────────────────────────────────────
    // 6. Seed Shift Groups + Working Shifts
    // ──────────────────────────────────────
    const groupRepo = dataSource.getRepository(ShiftGroupEntity);
    const groupData = [
      { groupName: 'Nhóm ca chính', status: 'active' },
      { groupName: 'Nhóm ca phụ', status: 'active' },
    ];
    const groups = {};
    for (const g of groupData) {
      let group = await groupRepo.findOne({
        where: { groupName: g.groupName },
      });
      if (!group) {
        group = groupRepo.create(g);
        await groupRepo.save(group);
        console.log(`Created shift group: ${g.groupName}`);
      } else if (g.status && group.status !== g.status) {
        // ensure existing rows have status field populated
        group.status = g.status;
        await groupRepo.save(group);
      }
      groups[g.groupName] = group;
    }

    const shiftRepo = dataSource.getRepository(WorkingShiftEntity);
    const shiftsData = [
      {
        shiftName: 'Ca hành chính',
        startTime: '08:00:00',
        endTime: '17:00:00',
        breakStartTime: '12:00:00',
        breakEndTime: '13:00:00',
        groupId: groups['Nhóm ca chính'].id,
      },
      {
        shiftName: 'Ca sáng',
        startTime: '06:00:00',
        endTime: '14:00:00',
        breakStartTime: '10:00:00',
        breakEndTime: '10:30:00',
        groupId: groups['Nhóm ca chính'].id,
      },
    ];
    const shifts = {};
    for (const s of shiftsData) {
      let shift = await shiftRepo.findOne({
        where: { shiftName: s.shiftName },
      });
      if (!shift) {
        shift = shiftRepo.create(s);
        await shiftRepo.save(shift);
        console.log(`Created shift: ${s.shiftName}`);
      } else if (!shift.groupId && s.groupId) {
        shift.groupId = s.groupId;
        await shiftRepo.save(shift);
      }
      shifts[s.shiftName] = shift;
    }

    // ──────────────────────────────────────
    // 7. Assign Shifts to Employees
    // ──────────────────────────────────────
    const shiftAssignmentRepo = dataSource.getRepository(ShiftAssignmentEntity);
    const allEmployees = await employeeRepo.find({
      where: { isDeleted: false },
    });
    for (const emp of allEmployees) {
      const existing = await shiftAssignmentRepo.findOne({
        where: { employeeId: emp.id, isDeleted: false },
      });
      if (!existing) {
        await shiftAssignmentRepo.save(
          shiftAssignmentRepo.create({
            employeeId: emp.id,
            departmentId: null,
            shiftId: shifts['Ca hành chính'].id,
            effectiveFrom: '2026-01-01',
          }),
        );
        console.log(`Assigned shift to employee: ${emp.fullName}`);
      }
    }

    // ──────────────────────────────────────
    // 8. Seed Holidays
    // ──────────────────────────────────────
    const holidayRepo = dataSource.getRepository(HolidayListEntity);
    const holidaysData = [
      {
        holidayName: 'Tết Nguyên đán (bù)',
        startDate: '2026-02-02',
        endDate: '2026-02-02',
        holidayType: 'Nghỉ lễ, tết',
        isPaid: true,
        description: 'Nghỉ bù Tết Nguyên đán',
      },
    ];
    for (const h of holidaysData) {
      const existing = await holidayRepo.findOne({
        where: { startDate: h.startDate, holidayName: h.holidayName },
      });
      if (!existing) {
        await holidayRepo.save(holidayRepo.create(h));
        console.log(`Created holiday: ${h.holidayName}`);
      }
    }

    // 8.1 Seed Holiday Groups and Configuration
    const holidayGroupRepo = dataSource.getRepository(HolidayGroupEntity);
    let defaultGroup = await holidayGroupRepo.findOne({
      where: { groupCode: 'DEFAULT_2026' },
    });
    if (!defaultGroup) {
      defaultGroup = await holidayGroupRepo.findOne({
        where: { groupName: 'Default Holiday Group' },
      });
    }
    if (!defaultGroup) {
      defaultGroup = holidayGroupRepo.create({
        groupName: 'Default Holiday Group',
        groupCode: 'DEFAULT_2026',
        year: 2026,
        applicableScope: 'GLOBAL',
        status: 'ACTIVE',
        description: 'Default group for all holidays',
      });
      await holidayGroupRepo.save(defaultGroup);
      console.log('Created default holiday group');
    } else {
      let changed = false;
      if (!defaultGroup.groupCode) {
        defaultGroup.groupCode = 'DEFAULT_2026';
        changed = true;
      }
      if (!defaultGroup.year) {
        defaultGroup.year = 2026;
        changed = true;
      }
      if (!defaultGroup.applicableScope) {
        defaultGroup.applicableScope = 'GLOBAL';
        changed = true;
      }
      if (!defaultGroup.status) {
        defaultGroup.status = 'ACTIVE';
        changed = true;
      }
      if (changed) {
        await holidayGroupRepo.save(defaultGroup);
      }
    }

    for (const d of Object.values(departments)) {
      if (!d.holidayGroupId) {
        d.holidayGroupId = defaultGroup.id;
        await departmentRepo.save(d);
      }
    }

    const holidayConfigRepo = dataSource.getRepository(HolidayConfigEntity);
    let holidayConfig = await holidayConfigRepo.findOne({
      where: { isDeleted: false },
    });
    if (!holidayConfig) {
      holidayConfig = holidayConfigRepo.create({
        isPaidByDefault: true,
        compensatoryWorkingDaysEnabled: true,
        holidayReminderPolicy: 'Send reminder 1 day before',
        defaultHolidayGroupId: defaultGroup.id,
        remindersEnabled: true,
        reminderLeadTime: 1,
        reminderChannels: ['IN_APP', 'EMAIL'],
        reminderRecipients: ['ADMIN', 'HR', 'MANAGER', 'EMPLOYEE'],
        reminderHolidayTypes: ['Nghỉ lễ, tết'],
      });
      await holidayConfigRepo.save(holidayConfig);
      console.log('Created initial holiday configuration');
    }

    // Update existing holidays to point to default group if they don't have one
    const allHolidays = await holidayRepo.find();
    for (const h of allHolidays) {
      if (!h.holidayGroupId) {
        h.holidayGroupId = defaultGroup.id;
        await holidayRepo.save(h);
      }
    }

    // 9. Seed Payroll Types
    const payrollTypeRepo = dataSource.getRepository(PayrollTypeEntity);
    const adminUser = await userRepo.findOne({ where: { username: 'admin' } });
    const payrollTypesData = [
      {
        payrollTypeCode: '1',
        name: 'Bảng lương sản xuất',
        keyword: 'LUONG_SAN_XUAT',
        description: 'Bảng lương dành cho công nhân sản xuất (theo sản lượng)',
        departmentId: departments['Software Development'].id, // Placeholder
        createdById: adminUser.id,
      },
      {
        payrollTypeCode: '101',
        name: 'Bảng lương cấp đông',
        keyword: 'LUONG_CAP_DONG_TAG',
        description: 'Bảng lương dành cho bộ phận cấp đông (theo công đoạn)',
        departmentId: departments['Software Development'].id, // Placeholder
        createdById: adminUser.id,
      },
      {
        payrollTypeCode: 'OFFICE_01',
        name: 'Bảng lương văn phòng',
        keyword: 'LUONG_VAN_PHONG',
        description: 'Bảng lương dành cho nhân viên văn phòng (theo tháng)',
        departmentId: departments['Software Development'].id, // Placeholder
        createdById: adminUser.id,
      },
    ];

    for (const pt of payrollTypesData) {
      const existing = await payrollTypeRepo.findOne({
        where: { payrollTypeCode: pt.payrollTypeCode },
      });
      if (!existing) {
        await payrollTypeRepo.save(payrollTypeRepo.create(pt));
        console.log(`Created payroll type: ${pt.name}`);
      }
    }

    // 9.1 Seed Missing Business Tables
    const activeUsers = await userRepo.find({ where: { isDeleted: false } });
    const activeEmployees = await employeeRepo.find({
      where: { isDeleted: false },
    });
    const usersByUsername = Object.fromEntries(
      activeUsers.map((u) => [u.username, u]),
    );
    const employeesByCode = Object.fromEntries(
      activeEmployees.map((e) => [e.employeeCode, e]),
    );

    const adminEmployee = employeesByCode['EMP001'] || activeEmployees[0];
    const managerEmployee = employeesByCode['EMP002'] || activeEmployees[0];
    const staffEmployee = employeesByCode['EMP003'] || activeEmployees[0];
    const hrEmployee = employeesByCode['EMP004'] || activeEmployees[0];

    const positions = await positionRepo.find({ where: { isDeleted: false } });
    const positionByName = Object.fromEntries(
      positions.map((p) => [p.positionName, p]),
    );
    const jobGrades = await jobGradeRepo.find({ where: { isDeleted: false } });

    const employeeMasterProfiles = [
      {
        code: 'EMP001',
        positionName: 'Backend Developer',
        departmentName: 'Software Development',
        managerCode: null,
        joinDate: '2024-01-01',
      },
      {
        code: 'EMP002',
        positionName: 'Backend Developer',
        departmentName: 'Software Development',
        managerCode: 'EMP001',
        joinDate: '2024-03-01',
      },
      {
        code: 'EMP003',
        positionName: 'Frontend Developer',
        departmentName: 'Software Development',
        managerCode: 'EMP002',
        joinDate: '2025-01-10',
      },
      {
        code: 'EMP004',
        positionName: 'HR Specialist',
        departmentName: 'Human Resources',
        managerCode: 'EMP001',
        joinDate: '2024-05-05',
      },
    ];

    for (const profile of employeeMasterProfiles) {
      const emp = employeesByCode[profile.code];
      if (!emp) continue;

      const dept = departments[profile.departmentName];
      const position = positionByName[profile.positionName];
      const manager =
        profile.managerCode && employeesByCode[profile.managerCode]
          ? employeesByCode[profile.managerCode]
          : null;

      const deptGrades = jobGrades.filter((g) => g.departmentId === dept?.id);
      const fallbackGrade =
        deptGrades.find((g) => g.gradeName === 'Junior') ||
        deptGrades[0] ||
        null;

      emp.departmentId = dept?.id || emp.departmentId;
      emp.positionId = position?.id || emp.positionId;
      emp.jobGradeId = emp.jobGradeId || fallbackGrade?.id || null;
      emp.directManagerId = manager?.id || null;
      emp.hrMentorId = hrEmployee?.id || null;
      emp.joinDate = emp.joinDate || profile.joinDate;
      emp.officialStartDate = emp.officialStartDate || profile.joinDate;
      await employeeRepo.save(emp);
    }

    if (managerEmployee && departments['Software Development']) {
      const dept = departments['Software Development'];
      dept.managerEmployeeId = managerEmployee.id;
      await departmentRepo.save(dept);
      departments['Software Development'] = dept;
    }
    if (hrEmployee && departments['Human Resources']) {
      const dept = departments['Human Resources'];
      dept.managerEmployeeId = hrEmployee.id;
      await departmentRepo.save(dept);
      departments['Human Resources'] = dept;
    }

    // Contracts
    const contractRepo = dataSource.getRepository(ContractEntity);
    for (const emp of activeEmployees) {
      const contractNumber = `CTR-${emp.employeeCode || emp.id}-2026`;
      const existing = await contractRepo.findOne({
        where: { employeeId: emp.id, contractNumber },
      });
      if (!existing) {
        await contractRepo.save(
          contractRepo.create({
            employeeId: emp.id,
            contractNumber,
            contractType: 'permanent',
            startDate: '2026-01-01',
            workingHours: 8,
            contractStatus: 'ACTIVE',
            signedDate: '2025-12-20',
            note: 'Initial seed contract',
          }),
        );
      }
    }

    // Employee salaries
    const employeeSalaryRepo = dataSource.getRepository(EmployeeSalaryEntity);
    const refreshedEmployees = await employeeRepo.find({
      where: { isDeleted: false },
    });
    for (const emp of refreshedEmployees) {
      const existing = await employeeSalaryRepo.findOne({
        where: {
          employeeId: emp.id,
          salaryType: 1,
          effectiveFrom: '2026-01-01',
        },
      });
      if (existing) continue;

      const grade = jobGrades.find((g) => g.id === emp.jobGradeId);
      const baseSalary = grade ? Number(grade.minSalary) : 1000;
      await employeeSalaryRepo.save(
        employeeSalaryRepo.create({
          employeeId: emp.id,
          jobGradeId: emp.jobGradeId,
          baseSalary,
          performanceSalary: Math.round(baseSalary * 0.15),
          lunchAllowance: 50,
          fuelAllowance: 30,
          phoneAllowance: 20,
          otherAllowance: 0,
          salaryType: 1,
          effectiveFrom: '2026-01-01',
          salaryStatus: 'ACTIVE',
        }),
      );
    }

    // Employee profile sub tables
    const bankRepo = dataSource.getRepository(EmployeeBankAccountEntity);
    const dependentRepo = dataSource.getRepository(EmployeeDependentEntity);
    const educationRepo = dataSource.getRepository(EmployeeEducationEntity);
    const emergencyRepo = dataSource.getRepository(
      EmployeeEmergencyContactEntity,
    );
    const workHistoryRepo = dataSource.getRepository(EmployeeWorkHistoryEntity);

    if (staffEmployee) {
      const bankExists = await bankRepo.findOne({
        where: { employeeId: staffEmployee.id, accountNumber: '001234567890' },
      });
      if (!bankExists) {
        await bankRepo.save(
          bankRepo.create({
            employeeId: staffEmployee.id,
            accountNumber: '001234567890',
            accountHolderName: staffEmployee.fullName,
            bankName: 'Vietcombank',
            bankBranch: 'Ha Noi',
            status: 'ACTIVE',
          }),
        );
      }

      const depExists = await dependentRepo.findOne({
        where: { employeeId: staffEmployee.id, fullName: 'Nguyen Thi A' },
      });
      if (!depExists) {
        await dependentRepo.save(
          dependentRepo.create({
            employeeId: staffEmployee.id,
            relationship: 'SPOUSE',
            fullName: 'Nguyen Thi A',
            dateOfBirth: '1999-06-12',
            gender: 'FEMALE',
            phoneNumber: '0900000001',
            isDependent: true,
            dependentFrom: '2026-01-01',
          }),
        );
      }

      const eduExists = await educationRepo.findOne({
        where: {
          employeeId: staffEmployee.id,
          institutionName: 'University of Engineering and Technology',
        },
      });
      if (!eduExists) {
        await educationRepo.save(
          educationRepo.create({
            employeeId: staffEmployee.id,
            startDate: '2018-09-01',
            endDate: '2022-06-30',
            educationType: 'UNIVERSITY',
            major: 'Software Engineering',
            degree: 'Bachelor',
            institutionName: 'University of Engineering and Technology',
          }),
        );
      }

      const emergencyExists = await emergencyRepo.findOne({
        where: {
          employeeId: staffEmployee.id,
          contactName: 'Nguyen Van B',
        },
      });
      if (!emergencyExists) {
        await emergencyRepo.save(
          emergencyRepo.create({
            employeeId: staffEmployee.id,
            contactName: 'Nguyen Van B',
            relationship: 'FATHER',
            phoneNumber: '0900000002',
            email: 'father@example.com',
            address: 'Ha Noi',
          }),
        );
      }

      const workHisExists = await workHistoryRepo.findOne({
        where: {
          employeeId: staffEmployee.id,
          companyName: 'ABC Tech',
        },
      });
      if (!workHisExists) {
        await workHistoryRepo.save(
          workHistoryRepo.create({
            employeeId: staffEmployee.id,
            startDate: '2022-07-01',
            endDate: '2024-12-31',
            companyName: 'ABC Tech',
            departmentName: 'Engineering',
            positionName: 'Junior Developer',
            referencePerson: 'Tran Van C',
            referencePhone: '0900000003',
            jobDescription: 'Frontend development',
          }),
        );
      }
    }

    // Leave types, policies, balances
    const leaveTypeRepo = dataSource.getRepository(LeaveTypeEntity);
    const leavePolicyRepo = dataSource.getRepository(LeavePolicyEntity);
    const leaveBalanceRepo = dataSource.getRepository(LeaveBalanceEntity);

    const leaveTypesData = [
      { leaveTypeName: 'Annual Leave', isPaid: true },
      { leaveTypeName: 'Sick Leave', isPaid: true },
      { leaveTypeName: 'Unpaid Leave', isPaid: false },
    ];
    const leaveTypes = {};
    for (const lt of leaveTypesData) {
      let row = await leaveTypeRepo.findOne({
        where: { leaveTypeName: lt.leaveTypeName },
      });
      if (!row) {
        row = await leaveTypeRepo.save(leaveTypeRepo.create(lt));
      }
      leaveTypes[lt.leaveTypeName] = row;
    }

    const leavePoliciesData = [
      {
        leaveTypeName: 'Annual Leave',
        policyName: 'Annual Standard',
        daysPerYear: 12,
      },
      {
        leaveTypeName: 'Sick Leave',
        policyName: 'Sick Standard',
        daysPerYear: 6,
      },
      {
        leaveTypeName: 'Unpaid Leave',
        policyName: 'Unpaid Standard',
        daysPerYear: 30,
      },
    ];
    for (const lp of leavePoliciesData) {
      const leaveType = leaveTypes[lp.leaveTypeName];
      const exists = await leavePolicyRepo.findOne({
        where: { leaveTypeId: leaveType.id, policyName: lp.policyName },
      });
      if (!exists) {
        await leavePolicyRepo.save(
          leavePolicyRepo.create({
            leaveTypeId: leaveType.id,
            policyName: lp.policyName,
            daysPerYear: lp.daysPerYear,
          }),
        );
      }
    }

    for (const emp of refreshedEmployees) {
      for (const leaveType of Object.values(leaveTypes)) {
        const exists = await leaveBalanceRepo.findOne({
          where: {
            employeeId: emp.id,
            leaveTypeId: leaveType.id,
            year: 2026,
          },
        });
        if (!exists) {
          await leaveBalanceRepo.save(
            leaveBalanceRepo.create({
              employeeId: emp.id,
              leaveTypeId: leaveType.id,
              year: 2026,
              usedDays: 0,
            }),
          );
        }
      }
    }

    // Overtime and penalty setup
    const overtimeTypeRepo = dataSource.getRepository(OvertimeTypeEntity);
    const overtimeRuleRepo = dataSource.getRepository(OvertimeRuleEntity);
    const overtimeRuleDepartmentRepo = dataSource.getRepository(
      OvertimeRuleDepartmentEntity,
    );
    const penaltyRepo = dataSource.getRepository(PenaltyEntity);

    const overtimeTypesData = [
      {
        code: 'WEEKDAY',
        name: 'OT ngày thường',
        description: 'OT ngày làm việc',
      },
      {
        code: 'WEEKEND',
        name: 'OT cuối tuần',
        description: 'OT thứ bảy/chủ nhật',
      },
      { code: 'HOLIDAY', name: 'OT ngày lễ', description: 'OT ngày nghỉ lễ' },
    ];
    const overtimeTypes = {};
    for (const t of overtimeTypesData) {
      let row = await overtimeTypeRepo.findOne({ where: { code: t.code } });
      if (!row) {
        row = await overtimeTypeRepo.save(overtimeTypeRepo.create(t));
      }
      overtimeTypes[t.code] = row;
    }

    const overtimeRulesData = [
      {
        name: 'Rule Weekday 150%',
        overtimeTypeId: overtimeTypes['WEEKDAY'].id,
        salaryMultiplier: 1.5,
        maxHoursPerDay: 4,
        maxHoursPerMonth: 40,
      },
      {
        name: 'Rule Weekend 200%',
        overtimeTypeId: overtimeTypes['WEEKEND'].id,
        salaryMultiplier: 2.0,
        maxHoursPerDay: 8,
        maxHoursPerMonth: 48,
      },
      {
        name: 'Rule Holiday 300%',
        overtimeTypeId: overtimeTypes['HOLIDAY'].id,
        salaryMultiplier: 3.0,
        maxHoursPerDay: 8,
        maxHoursPerMonth: 48,
      },
    ];
    const overtimeRules = {};
    for (const rule of overtimeRulesData) {
      let row = await overtimeRuleRepo.findOne({ where: { name: rule.name } });
      if (!row) {
        row = await overtimeRuleRepo.save(
          overtimeRuleRepo.create({
            ...rule,
            effectiveFrom: '2026-01-01',
            versionStatus: 'ACTIVE',
            status: 'ACTIVE',
          }),
        );
      }
      overtimeRules[rule.name] = row;
    }

    for (const rule of Object.values(overtimeRules)) {
      for (const d of Object.values(departments)) {
        const exists = await overtimeRuleDepartmentRepo.findOne({
          where: { overtimeRuleId: rule.id, departmentId: d.id },
        });
        if (!exists) {
          await overtimeRuleDepartmentRepo.save(
            overtimeRuleDepartmentRepo.create({
              overtimeRuleId: rule.id,
              departmentId: d.id,
              isDeleted: false,
            }),
          );
        }
      }
    }

    const penaltiesData = [
      {
        violationType: 'LATE',
        effectiveFrom: '2024-01-01',
        fromMinute: 15,
        toMinute: 30,
        convertedHours: 0.25,
        note: 'Đi muộn 15-30 phút trừ 0.25h công',
      },
      {
        violationType: 'LATE',
        effectiveFrom: '2024-01-01',
        fromMinute: 31,
        toMinute: 60,
        convertedHours: 0.5,
        note: 'Đi muộn 31-60 phút trừ 0.5h công',
      },
      {
        violationType: 'EARLY',
        effectiveFrom: '2024-01-01',
        fromMinute: 15,
        toMinute: 60,
        convertedHours: 0.5,
        note: 'Về sớm 15-60 phút trừ 0.5h công',
      },
    ];
    for (const p of penaltiesData) {
      const exists = await penaltyRepo.findOne({ 
        where: { 
          violationType: p.violationType,
          fromMinute: p.fromMinute,
          toMinute: p.toMinute,
          effectiveFrom: p.effectiveFrom 
        } 
      });
      if (!exists) {
        await penaltyRepo.save(penaltyRepo.create({ ...p, status: 'ACTIVE' }));
      }
    }

    // Onboarding flow
    const onboardingPlanRepo = dataSource.getRepository(OnboardingPlanEntity);
    const onboardingTaskRepo = dataSource.getRepository(OnboardingTaskEntity);
    const onboardingProgressRepo = dataSource.getRepository(
      OnboardingProgressEntity,
    );
    const taskAssignmentRepo = dataSource.getRepository(TaskAssignmentEntity);

    let onboardingPlan = await onboardingPlanRepo.findOne({
      where: { planName: 'Kế hoạch onboarding nhân viên kỹ thuật' },
    });
    if (!onboardingPlan) {
      onboardingPlan = await onboardingPlanRepo.save(
        onboardingPlanRepo.create({
          planName: 'Kế hoạch onboarding nhân viên kỹ thuật',
          description: 'Áp dụng cho nhân viên kỹ thuật mới',
          durationDays: 30,
          departmentId: departments['Software Development']?.id,
          positionId: positionByName['Frontend Developer']?.id,
          status: 'ACTIVE',
          createdBy: adminEmployee?.id,
          isTemplate: true,
        }),
      );
    }

    const onboardingTasksData = [
      {
        taskOrder: 1,
        description: 'Nhận tài khoản hệ thống và email công ty',
        responsibleDepartmentId: departments['Human Resources']?.id,
        estimatedDays: 1,
        category: 'ADMIN',
      },
      {
        taskOrder: 2,
        description: 'Setup môi trường phát triển',
        responsibleDepartmentId: departments['Software Development']?.id,
        estimatedDays: 2,
        category: 'TECHNICAL',
      },
      {
        taskOrder: 3,
        description: 'Hoàn thành tài liệu coding convention',
        responsibleDepartmentId: departments['Software Development']?.id,
        estimatedDays: 3,
        category: 'TRAINING',
      },
    ];

    const onboardingTasks = [];
    for (const t of onboardingTasksData) {
      let task = await onboardingTaskRepo.findOne({
        where: { planId: onboardingPlan.id, taskOrder: t.taskOrder },
      });
      if (!task) {
        task = await onboardingTaskRepo.save(
          onboardingTaskRepo.create({
            planId: onboardingPlan.id,
            ...t,
            isMandatory: true,
          }),
        );
      }
      onboardingTasks.push(task);
    }

    if (staffEmployee) {
      let progress = await onboardingProgressRepo.findOne({
        where: { employeeId: staffEmployee.id, planId: onboardingPlan.id },
      });
      if (!progress) {
        progress = await onboardingProgressRepo.save(
          onboardingProgressRepo.create({
            employeeId: staffEmployee.id,
            planId: onboardingPlan.id,
            overallStatus: 'IN_PROGRESS',
            startDate: '2026-02-01',
            expectedEndDate: '2026-03-02',
            progressPercentage: 33.33,
            completedTasksCount: 1,
            totalTasksCount: onboardingTasks.length,
            assignedMentorId: managerEmployee?.id,
          }),
        );
      }

      for (const task of onboardingTasks) {
        const exists = await taskAssignmentRepo.findOne({
          where: { progressId: progress.id, taskId: task.id },
        });
        if (!exists) {
          await taskAssignmentRepo.save(
            taskAssignmentRepo.create({
              progressId: progress.id,
              taskId: task.id,
              assignedToEmployeeId: staffEmployee.id,
              assignedByUserId: usersByUsername['admin']?.id,
              status: task.taskOrder === 1 ? 'COMPLETED' : 'PENDING',
              assignedDate: new Date('2026-02-01T09:00:00'),
              dueDate:
                task.taskOrder === 1
                  ? '2026-02-02'
                  : task.taskOrder === 2
                    ? '2026-02-04'
                    : '2026-02-07',
              completionDate:
                task.taskOrder === 1 ? new Date('2026-02-02T16:00:00') : null,
              notes: 'Seeded onboarding task assignment',
              priority: task.taskOrder === 1 ? 'HIGH' : 'NORMAL',
            }),
          );
        }
      }

      if (!staffEmployee.planId) {
        staffEmployee.planId = onboardingPlan.id;
        await employeeRepo.save(staffEmployee);
      }
    }

    // Requests and approval flow
    // * Seed data cho Request đã được gỡ bỏ vì tính năng Request Execution cấu hình request type qua Database, và reference tới file cũ không còn.
    // * Test thông qua giao diện Web theo thiết kế mới.

    // Timesheets
    const timeSheetRepo = dataSource.getRepository(TimeSheetEntity);
    for (const emp of refreshedEmployees) {
      const exists = await timeSheetRepo.findOne({
        where: { employeeId: emp.id, month: 2, year: 2026 },
      });
      if (!exists) {
        await timeSheetRepo.save(
          timeSheetRepo.create({
            employeeId: emp.id,
            month: 2,
            year: 2026,
            totalWorkingDays: 19,
            totalWorkingHours: 152,
            overtimeHours: emp.id === staffEmployee?.id ? 4 : 2,
            isLocked: false,
          }),
        );
      }
    }

    // Payroll and payroll details
    const payrollRepo = dataSource.getRepository(PayrollEntity);
    const payrollDetailRepo = dataSource.getRepository(PayrollDetailEntity);

    let febPayroll = await payrollRepo.findOne({
      where: { payrollMonth: 2, payrollYear: 2026 },
    });
    if (!febPayroll) {
      febPayroll = await payrollRepo.save(
        payrollRepo.create({
          payrollMonth: 2,
          payrollYear: 2026,
          payrollStatus: 'DRAFT',
          submittedBy: hrEmployee?.id,
        }),
      );
    }

    const salaryRows = await employeeSalaryRepo.find({
      where: { isDeleted: false },
    });
    const salaryByEmployeeId = Object.fromEntries(
      salaryRows.map((s) => [s.employeeId, s]),
    );

    for (const emp of refreshedEmployees) {
      const exists = await payrollDetailRepo.findOne({
        where: { payrollId: febPayroll.id, employeeId: emp.id },
      });
      if (exists) continue;

      const salary = salaryByEmployeeId[emp.id];
      const baseSalary = salary ? Number(salary.baseSalary) : 1000;
      const overtimePay = emp.id === staffEmployee?.id ? 150 : 80;
      const gross = baseSalary + overtimePay;
      const insuranceDeduction = Math.round(gross * 0.08);
      const taxDeduction = Math.round(gross * 0.02);
      const netSalary = gross - insuranceDeduction - taxDeduction;

      await payrollDetailRepo.save(
        payrollDetailRepo.create({
          payrollId: febPayroll.id,
          employeeId: emp.id,
          workingDays: 19,
          baseSalary,
          overtimePay,
          bonus: 0,
          penalty: 0,
          deduction: 0,
          insuranceDeduction,
          taxDeduction,
          netSalary,
          note: 'Seed payroll detail',
        }),
      );
    }


    // Shift schedules from shift assignments
    const shiftScheduleRepo = dataSource.getRepository(ShiftScheduleEntity);
    const shiftAssignments = await shiftAssignmentRepo.find({
      where: { isDeleted: false },
    });
    for (const assignment of shiftAssignments) {
      if (!assignment.employeeId || !assignment.shiftId) continue;
      const exists = await shiftScheduleRepo.findOne({
        where: { assignmentId: assignment.id, workDate: '2026-02-03' },
      });
      if (!exists) {
        await shiftScheduleRepo.save(
          shiftScheduleRepo.create({
            assignmentId: assignment.id,
            employeeId: assignment.employeeId,
            departmentId: assignment.departmentId,
            shiftId: assignment.shiftId,
            workDate: '2026-02-03',
          }),
        );
      }
    }

    // Notifications and action logs
    const notificationRepo = dataSource.getRepository(NotificationEntity);
    const notificationRecipientRepo = dataSource.getRepository(
      NotificationRecipientEntity,
    );
    const actionLogRepo = dataSource.getRepository(ActionLogEntity);

    let initNotification = await notificationRepo.findOne({
      where: { title: 'Thông báo khởi tạo hệ thống' },
    });
    if (!initNotification) {
      initNotification = await notificationRepo.save(
        notificationRepo.create({
          title: 'Thông báo khởi tạo hệ thống',
          message: 'Dữ liệu mẫu ban đầu đã được tạo thành công.',
          notificationType: 'SYSTEM',
        }),
      );
    }

    for (const user of activeUsers) {
      const exists = await notificationRecipientRepo.findOne({
        where: { notificationId: initNotification.id, userId: user.id },
      });
      if (!exists) {
        await notificationRecipientRepo.save(
          notificationRecipientRepo.create({
            notificationId: initNotification.id,
            userId: user.id,
            isRead: false,
          }),
        );
      }
    }

    const seedActionExists = await actionLogRepo.findOne({
      where: { actionType: 'SEED_INIT', targetTable: 'system' },
    });
    if (!seedActionExists) {
      await actionLogRepo.save(
        actionLogRepo.create({
          userId: usersByUsername['admin']?.id,
          actionType: 'SEED_INIT',
          targetTable: 'system',
          description: 'Initial seed data completed',
          requestIp: '127.0.0.1',
          userAgent: 'seed-script',
          status: 'SUCCESS',
        }),
      );
    }

    // Face recognition setup
    const faceConfigRepo = dataSource.getRepository(
      FaceRecognitionConfigEntity,
    );
    const faceDataRepo = dataSource.getRepository(FaceDataEntity);

    let faceConfig = await faceConfigRepo.findOne({
      where: { modelVersion: 'v1.0-seed' },
    });
    if (!faceConfig) {
      faceConfig = await faceConfigRepo.save(
        faceConfigRepo.create({
          confidenceThreshold: 85,
          modelVersion: 'v1.0-seed',
        }),
      );
    }

    for (const emp of refreshedEmployees.slice(0, 2)) {
      const exists = await faceDataRepo.findOne({
        where: { employeeId: emp.id },
      });
      if (!exists) {
        await faceDataRepo.save(
          faceDataRepo.create({
            employeeId: emp.id,
            faceVector: JSON.stringify([0.1, 0.2, 0.3, 0.4]),
            registeredAt: new Date('2026-01-15T09:00:00'),
          }),
        );
      }
    }

    // AI criteria and evaluation results
    const aiCriteriaRepo = dataSource.getRepository(AICriteriaEntity);
    const aiResultRepo = dataSource.getRepository(AIEvaluationResultEntity);

    const aiCriteriaData = [
      {
        criteriaName: 'Productivity',
        weight: 40,
        description: 'Output per sprint',
      },
      {
        criteriaName: 'Quality',
        weight: 35,
        description: 'Code quality and defects',
      },
      {
        criteriaName: 'Collaboration',
        weight: 25,
        description: 'Team collaboration',
      },
    ];
    const aiCriteriaRows = {};
    for (const c of aiCriteriaData) {
      let row = await aiCriteriaRepo.findOne({
        where: { criteriaName: c.criteriaName },
      });
      if (!row) {
        row = await aiCriteriaRepo.save(aiCriteriaRepo.create(c));
      }
      aiCriteriaRows[c.criteriaName] = row;
    }

    if (staffEmployee) {
      const aiScores = [
        {
          criteriaName: 'Productivity',
          score: 82.5,
          feedback: 'Good delivery pace',
        },
        { criteriaName: 'Quality', score: 88.0, feedback: 'Low bug rate' },
        {
          criteriaName: 'Collaboration',
          score: 90.0,
          feedback: 'Supports team effectively',
        },
      ];
      for (const s of aiScores) {
        const criteria = aiCriteriaRows[s.criteriaName];
        const exists = await aiResultRepo.findOne({
          where: {
            employeeId: staffEmployee.id,
            criteriaId: criteria.id,
          },
        });
        if (!exists) {
          await aiResultRepo.save(
            aiResultRepo.create({
              employeeId: staffEmployee.id,
              criteriaId: criteria.id,
              score: s.score,
              feedback: s.feedback,
            }),
          );
        }
      }
    }

    // ──────────────────────────────────────
    // 10. Seed Attendance Records (Feb 2026)
    // ──────────────────────────────────────
    const attendanceRepo = dataSource.getRepository(AttendanceRecordEntity);
    const existingAttCount = await attendanceRepo.count();
    if (existingAttCount === 0) {
      console.log('Seeding high-quality attendance records for Feb 2026...');

      // Clear existing records for Feb 2026 to avoid duplicates
      await attendanceRepo.delete({
        checkInTime: Between('2026-02-01 00:00:00', '2026-02-28 23:59:59'),
      });

      for (const emp of allEmployees) {
        const records = [];
        // February 2026: 28 days. Weekdays are 2-6, 9-13, 16-20, 23-27
        const weekdays = [
          2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 16, 17, 18, 19, 20, 23, 24, 25, 26,
          27,
        ];

        for (const day of weekdays) {
          // Feb 2 is holiday but some might work (OT) - let's skip it for normal behavior
          if (day === 2) continue;

          // Default: 08:00 - 17:00
          let cinH = 7,
            cinM = 50 + Math.floor(Math.random() * 15); // 07:50 - 08:05
          let coutH = 17,
            coutM = Math.floor(Math.random() * 15); // 17:00 - 17:15
          let status = 'ON_TIME';
          let type = 'NORMAL';

          // Randomize some behavior
          const rand = Math.random();
          if (rand < 0.1) {
            // 10% late
            cinM = 10 + Math.floor(Math.random() * 20); // 08:10 - 08:30
            status = 'LATE';
          } else if (rand < 0.2) {
            // 10% early leave
            coutH = 16;
            coutM = 30 + Math.floor(Math.random() * 20); // 16:30 - 16:50
            status = 'EARLY_LEAVE';
          } else if (rand < 0.3) {
            // 10% OT
            coutH = 18 + Math.floor(Math.random() * 2); // 18:00 - 20:00
            coutM = Math.floor(Math.random() * 60);
            type = 'OVERTIME';
          }

          const checkIn = new Date(2026, 1, day, cinH, cinM, 0);
          const checkOut = new Date(2026, 1, day, coutH, coutM, 0);

          records.push(
            attendanceRepo.create({
              employeeId: emp.id,
              checkInTime: checkIn,
              checkOutTime: checkOut,
              attendanceStatus: status,
              attendanceType: type,
            }),
          );
        }
        await attendanceRepo.save(records);
        console.log(
          `Created ${records.length} high-quality records for ${emp.fullName}`,
        );
      }
    } else {
      console.log(
        `Attendance records already exist (${existingAttCount}), skipping.`,
      );
    }

    console.log('Seeding completed successfully.');
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await dataSource.destroy();
  }
};

seed();
