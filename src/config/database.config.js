import { UserEntity } from '../models/entities/user.entity.js';
import { RoleEntity } from '../models/entities/role.entity.js';
import { PermissionEntity } from '../models/entities/permission.entity.js';
import { UserRoleEntity } from '../models/entities/user-role.entity.js';
import { RolePermissionEntity } from '../models/entities/role-permission.entity.js';
import { DepartmentEntity } from '../models/entities/department.entity.js';
import { PositionEntity } from '../models/entities/position.entity.js';
import { JobGradeEntity } from '../models/entities/job-grade.entity.js';
import { EmployeeEntity } from '../models/entities/employee.entity.js';
import { EmployeeBankAccountEntity } from '../models/entities/employee-bank-account.entity.js';
import { EmployeeEmergencyContactEntity } from '../models/entities/employee-emergency-contact.entity.js';
import { EmployeeDependentEntity } from '../models/entities/employee-dependent.entity.js';
import { EmployeeEducationEntity } from '../models/entities/employee-education.entity.js';
import { EmployeeWorkHistoryEntity } from '../models/entities/employee-work-history.entity.js';
import { ContractEntity } from '../models/entities/contract.entity.js';
import { EmployeeSalaryEntity } from '../models/entities/employee-salary.entity.js';
import { WorkingShiftEntity } from '../models/entities/working-shift.entity.js';
import { ShiftGroupEntity } from '../models/entities/shift-group.entity.js';
import { ShiftAssignmentEntity } from '../models/entities/shift-assignment.entity.js';
import { ShiftScheduleEntity } from '../models/entities/shift-schedule.entity.js';
import { AttendanceRecordEntity } from '../models/entities/attendance-record.entity.js';
import { TimeSheetEntity } from '../models/entities/time-sheet.entity.js';
import { FaceDataEntity } from '../models/entities/face-data.entity.js';
import { FaceRecognitionConfigEntity } from '../models/entities/face-recognition-config.entity.js';
import { LeaveTypeEntity } from '../models/entities/leave-type.entity.js';
import { LeavePolicyEntity } from '../models/entities/leave-policy.entity.js';
import { LeaveBalanceEntity } from '../models/entities/leave-balance.entity.js';
import { RequestEntity } from '../models/entities/request.entity.js';
import { RequestApprovalLevelEntity } from '../models/entities/request-approval-level.entity.js';
import { RequestAttachmentEntity } from '../models/entities/request-attachment.entity.js';
import { HolidayListEntity } from '../models/entities/holiday-list.entity.js';
import { PayrollEntity } from '../models/entities/payroll.entity.js';
import { PayrollDetailEntity } from '../models/entities/payroll-detail.entity.js';
import { AICriteriaEntity } from '../models/entities/ai-criteria.entity.js';
import { AIEvaluationResultEntity } from '../models/entities/ai-evaluation-result.entity.js';
import { NotificationEntity } from '../models/entities/notification.entity.js';
import { NotificationRecipientEntity } from '../models/entities/notification-recipient.entity.js';
import { ActionLogEntity } from '../models/entities/action-log.entity.js';
import { OnboardingPlanEntity } from '../models/entities/onboarding-plan.entity.js';
import { OnboardingTaskEntity } from '../models/entities/onboarding-task.entity.js';
import { OnboardingProgressEntity } from '../models/entities/onboarding-progress.entity.js';
import { TaskAssignmentEntity } from '../models/entities/task-assignment.entity.js';
import { OvertimeRuleEntity } from '../models/entities/overtime-rule.entity.js';
import { OvertimeRuleDepartmentEntity } from '../models/entities/overtime-rule-department.entity.js';
import { OvertimeTypeEntity } from '../models/entities/overtime-type.entity.js';
import { PenaltyEntity } from '../models/entities/penalty.entity.js';
import { PayrollTypeEntity } from '../models/entities/payroll-type.entity.js';
import { HolidayGroupEntity } from '../models/entities/holiday-group.entity.js';
import { HolidayConfigEntity } from '../models/entities/holiday-config.entity.js';
import { OvertimeRequestDetailEntity } from '../models/entities/overtime-request-detail.entity.js';
import { RequestGroupEntity } from '../models/entities/request-group.entity.js';
import { RequestGroupWorkflowEntity } from '../models/entities/request-group-workflow.entity.js';
import { RequestTypeEntity } from '../models/entities/request-type.entity.js';
import { RequestTypePolicyEntity } from '../models/entities/request-type-policy.entity.js';
import { ProcessedAttendanceRecordEntity } from '../models/entities/processed-attendance-record.entity.js';

import { config } from './env.config.js';
import { AuditSubscriber } from '../common/subscribers/audit.subscriber.js';
import { AttendanceSecurityConfigEntity } from '../models/entities/attendance-security-config.entity.js';
import { AttendanceAllowedIpEntity } from '../models/entities/attendance-allowed-ip.entity.js';
import { AttendanceBlockingConfigEntity } from '../models/entities/attendance-blocking-config.entity.js';
import { AttendanceSecurityStatusEntity } from '../models/entities/attendance-security-status.entity.js';
export const databaseConfig = {
  type: 'mysql',
  host: config.database.host,
  port: config.database.port,
  username: config.database.username,
  password: config.database.password,
  database: config.database.name,
  synchronize: true, // Auto-create tables (dev only)
  logging: false,
  entities: [
    UserEntity,
    RoleEntity,
    PermissionEntity,
    UserRoleEntity,
    RolePermissionEntity,
    DepartmentEntity,
    PositionEntity,
    JobGradeEntity,
    EmployeeEntity,
    EmployeeBankAccountEntity,
    EmployeeEmergencyContactEntity,
    EmployeeDependentEntity,
    EmployeeEducationEntity,
    EmployeeWorkHistoryEntity,
    ContractEntity,
    EmployeeSalaryEntity,
    WorkingShiftEntity,
    ShiftGroupEntity,
    ShiftAssignmentEntity,
    ShiftScheduleEntity,
    AttendanceRecordEntity,
    TimeSheetEntity,
    FaceDataEntity,
    FaceRecognitionConfigEntity,
    LeaveTypeEntity,
    LeavePolicyEntity,
    LeaveBalanceEntity,
    RequestEntity,
    RequestApprovalLevelEntity,
    RequestAttachmentEntity,
    HolidayListEntity,
    PayrollEntity,
    PayrollDetailEntity,
    AICriteriaEntity,
    AIEvaluationResultEntity,
    NotificationEntity,
    NotificationRecipientEntity,
    ActionLogEntity,
    OnboardingPlanEntity,
    OnboardingTaskEntity,
    OnboardingProgressEntity,
    TaskAssignmentEntity,
    OvertimeRuleEntity,
    OvertimeRuleDepartmentEntity,
    OvertimeTypeEntity,
    OvertimeRequestDetailEntity,
    PenaltyEntity,
    PayrollTypeEntity,
    HolidayGroupEntity,
    HolidayConfigEntity,
    RequestGroupEntity,
    RequestGroupWorkflowEntity,
    RequestTypeEntity,
    RequestTypePolicyEntity,
    ProcessedAttendanceRecordEntity,
    OvertimeRequestDetailEntity,
    AttendanceSecurityConfigEntity,
    AttendanceAllowedIpEntity,
    AttendanceBlockingConfigEntity,
    AttendanceSecurityStatusEntity,
  ],
  subscribers: [AuditSubscriber],
  migrations: [],
};
