import { DataSourceOptions } from 'typeorm';
import { UserEntity } from '../models/entities/user.entity';
import { RoleEntity } from '../models/entities/role.entity';
import { PermissionEntity } from '../models/entities/permission.entity';
import { UserRoleEntity } from '../models/entities/user-role.entity';
import { RolePermissionEntity } from '../models/entities/role-permission.entity';
import { DepartmentEntity } from '../models/entities/department.entity';
import { PositionEntity } from '../models/entities/position.entity';
import { JobGradeEntity } from '../models/entities/job-grade.entity';
import { EmployeeEntity } from '../models/entities/employee.entity';
import { EmployeeBankAccountEntity } from '../models/entities/employee-bank-account.entity';
import { EmployeeEmergencyContactEntity } from '../models/entities/employee-emergency-contact.entity';
import { EmployeeDependentEntity } from '../models/entities/employee-dependent.entity';
import { EmployeeEducationEntity } from '../models/entities/employee-education.entity';
import { EmployeeWorkHistoryEntity } from '../models/entities/employee-work-history.entity';
import { ContractEntity } from '../models/entities/contract.entity';
import { EmployeeSalaryEntity } from '../models/entities/employee-salary.entity';
import { WorkingShiftEntity } from '../models/entities/working-shift.entity';
import { ShiftAssignmentEntity } from '../models/entities/shift-assignment.entity';
import { AttendanceRecordEntity } from '../models/entities/attendance-record.entity';
import { TimeSheetEntity } from '../models/entities/time-sheet.entity';
import { FaceDataEntity } from '../models/entities/face-data.entity';
import { FaceRecognitionConfigEntity } from '../models/entities/face-recognition-config.entity';
import { LeaveTypeEntity } from '../models/entities/leave-type.entity';
import { LeavePolicyEntity } from '../models/entities/leave-policy.entity';
import { LeaveBalanceEntity } from '../models/entities/leave-balance.entity';
import { RequestEntity } from '../models/entities/request.entity';
import { RequestApproveEntity } from '../models/entities/request-approve.entity';
import { HolidayListEntity } from '../models/entities/holiday-list.entity';
import { PayrollEntity } from '../models/entities/payroll.entity';
import { PayrollDetailEntity } from '../models/entities/payroll-detail.entity';
import { AICriteriaEntity } from '../models/entities/ai-criteria.entity';
import { AIEvaluationResultEntity } from '../models/entities/ai-evaluation-result.entity';
import { NotificationEntity } from '../models/entities/notification.entity';
import { NotificationRecipientEntity } from '../models/entities/notification-recipient.entity';
import { ActionLogEntity } from '../models/entities/action-log.entity';

import { config } from './env.config';

export const databaseConfig: DataSourceOptions = {
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
        ShiftAssignmentEntity,
        AttendanceRecordEntity,
        TimeSheetEntity,
        FaceDataEntity,
        FaceRecognitionConfigEntity,
        LeaveTypeEntity,
        LeavePolicyEntity,
        LeaveBalanceEntity,
        RequestEntity,
        RequestApproveEntity,
        HolidayListEntity,
        PayrollEntity,
        PayrollDetailEntity,
        AICriteriaEntity,
        AIEvaluationResultEntity,
        NotificationEntity,
        NotificationRecipientEntity,
        ActionLogEntity,
    ],
    subscribers: [],
    migrations: [],
};
