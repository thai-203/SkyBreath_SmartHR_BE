import { OnboardingProgressRepository } from '../repositories/onboarding-progress.repository.js';
import { OnboardingPlansRepository } from '../repositories/onboarding-plans.repository.js';
import { TaskAssignmentsRepository } from '../repositories/task-assignments.repository.js';
import { EmployeesRepository } from '../repositories/employees.repository.js';
import {
  NotFoundException,
  BadRequestException,
} from '../common/exceptions/index.js';
import { AppMessages } from '../common/constants/index.js';
import { PaginatedResponseDto } from '../common/dto/index.js';
import { ExcelUtil } from '../common/utils/excel.util.js';
import { NotificationsService } from './notifications.service.js';

export class OnboardingProgressService {
  constructor() {
    this.progressRepository = new OnboardingProgressRepository();
    this.plansRepository = new OnboardingPlansRepository();
    this.taskAssignmentsRepository = new TaskAssignmentsRepository();
    this.employeesRepository = new EmployeesRepository();
    this.notificationsService = new NotificationsService();
  }

  toDateOnly(dateInput) {
    if (!dateInput) return null;
    const date = new Date(dateInput);
    if (Number.isNaN(date.getTime())) return null;
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  getDisplayStatusMeta(progress, now = new Date()) {
    const currentStatus = String(progress?.overallStatus || '').toUpperCase();
    const expectedEndDate = this.toDateOnly(progress?.expectedEndDate);
    const today = this.toDateOnly(now);

    if (!expectedEndDate || !today || currentStatus === 'COMPLETED') {
      return {
        isOverdue: false,
        overdueDays: 0,
        displayStatus: currentStatus || 'NOT_STARTED',
      };
    }

    if (today <= expectedEndDate) {
      return {
        isOverdue: false,
        overdueDays: 0,
        displayStatus: currentStatus || 'NOT_STARTED',
      };
    }

    const overdueMs = today.getTime() - expectedEndDate.getTime();
    const overdueDays = Math.floor(overdueMs / (1000 * 60 * 60 * 24));

    return {
      isOverdue: true,
      overdueDays,
      displayStatus: 'OVERDUE',
    };
  }

  enrichProgressDisplay(progress) {
    if (!progress) return progress;
    const statusMeta = this.getDisplayStatusMeta(progress);
    return {
      ...progress,
      ...statusMeta,
    };
  }

  async findAll(queryDto) {
    // special case: if client requested page 1 we ignore the limit and return all
    // records (makes initial load show everything regardless of the supplied
    // limit). we still compute the total count so metadata remains accurate.
    let effectiveLimit = queryDto.limit;

    if (queryDto.page === 1) {
      // fetch total count first so we can reuse it as limit
      const totalCount = await this.progressRepository.count(queryDto);
      effectiveLimit = totalCount;
      // update queryDto.limit for metadata calculations too
      queryDto.limit = totalCount;
    }

    const [progress, total] = await Promise.all([
      this.progressRepository.findAll(queryDto),
      this.progressRepository.count(queryDto),
    ]);

    const enrichedProgress = progress.map((item) =>
      this.enrichProgressDisplay(item),
    );

    return new PaginatedResponseDto(enrichedProgress, total, queryDto);
  }

  async findById(progressId) {
    const progress = await this.progressRepository.findById(progressId);
    if (!progress) {
      throw new NotFoundException(
        AppMessages.Errors.Onboarding?.PROGRESS_NOT_FOUND?.message ||
          `Không tìm thấy tiến trình onboarding có ID ${progressId}.`,
      );
    }
    return this.enrichProgressDisplay(progress);
  }

  async findByEmployee(employeeId) {
    const progress = await this.progressRepository.findByEmployeeId(employeeId);
    if (!progress) {
      throw new NotFoundException(
        AppMessages.Errors.Onboarding?.PROGRESS_NOT_FOUND?.message ||
          `Không tìm thấy tiến trình onboarding cho nhân viên ${employeeId}`,
      );
    }
    return this.enrichProgressDisplay(progress);
  }

  async findOwnProgress(userId) {
    const employee = await this.employeesRepository.findByUserId(userId);
    if (!employee) {
      throw new NotFoundException(
        `Không tìm thấy nhân viên liên kết với người dùng có ID ${userId}`,
      );
    }
    const progress = await this.progressRepository.findByEmployeeId(
      employee.id,
    );
    if (!progress) {
      throw new NotFoundException(
        AppMessages.Errors.Onboarding?.PROGRESS_NOT_FOUND?.message ||
          `Không tìm thấy tiến trình onboarding cho người dùng ${userId}`,
      );
    }
    return progress;
  }

  async create(employeeId, planId, assignedMentorId = null) {
    const plan = await this.plansRepository.findById(planId);
    if (!plan) {
      throw new NotFoundException(
        AppMessages.Errors.Onboarding?.PLAN_NOT_FOUND?.message ||
          `Kế hoạch với ID ${planId} không được tìm thấy`,
      );
    }

    // ensure employee exists
    const emp = await this.employeesRepository.findById(employeeId);
    if (!emp) {
      throw new BadRequestException(
        `Không tìm thấy nhân viên có ID ${employeeId}`,
      );
    }

    const existingProgress =
      await this.progressRepository.findByEmployeeAndPlan(employeeId, planId);
    if (existingProgress) {
      throw new BadRequestException(
        AppMessages.Errors.Onboarding?.PROGRESS_ALREADY_EXISTS?.message ||
          'Nhân viên đã có tiến trình onboarding cho kế hoạch này',
      );
    }

    const startDate = new Date();
    const expectedEndDate = new Date(startDate);
    expectedEndDate.setDate(expectedEndDate.getDate() + plan.durationDays);

    const createdProgress = await this.progressRepository.create({
      employeeId,
      planId,
      overallStatus: 'IN_PROGRESS',
      startDate,
      expectedEndDate,
      assignedMentorId,
      progressPercentage: 0,
      completedTasksCount: 0,
      totalTasksCount: plan.tasks?.length || 0,
    });

    try {
      const recipientUserId = Number(emp?.userId);
      if (Number.isFinite(recipientUserId) && recipientUserId > 0) {
        await this.notificationsService.createAndNotify({
          title: 'Bạn có onboarding mới',
          message: `Lộ trình onboarding ${plan.planName || ''} đã được gán cho bạn. Vui lòng vào màn hình onboarding để theo dõi tiến độ.`,
          notificationType: 'WORKFLOW',
          link: '/onboardings/employee',
          recipientUserIds: [recipientUserId],
        });
      }
    } catch (notificationError) {
      console.error(
        '[OnboardingProgressService] Failed to send onboarding notification:',
        notificationError,
      );
    }

    return createdProgress;
  }

  async update(progressId, data) {
    await this.findById(progressId);
    return this.progressRepository.update(progressId, {
      ...data,
      updatedAt: new Date(),
    });
  }

  async updateProgressPercentage(progressId) {
    const progress = await this.findById(progressId);
    const assignments =
      await this.taskAssignmentsRepository.findByProgressId(progressId);

    if (assignments.length === 0) {
      return progress;
    }

    const completedCount = assignments.filter(
      (a) => a.status === 'COMPLETED',
    ).length;
    const percentage = Math.round((completedCount / assignments.length) * 100);

    return this.progressRepository.update(progressId, {
      progressPercentage: percentage,
      completedTasksCount: completedCount,
      totalTasksCount: assignments.length,
      updatedAt: new Date(),
    });
  }

  async complete(progressId) {
    await this.findById(progressId);

    return this.progressRepository.update(progressId, {
      overallStatus: 'COMPLETED',
      actualEndDate: new Date(),
      updatedAt: new Date(),
    });
  }

  async pause(progressId) {
    await this.findById(progressId);

    return this.progressRepository.update(progressId, {
      overallStatus: 'ON_HOLD',
      updatedAt: new Date(),
    });
  }

  async resume(progressId) {
    const progress = await this.findById(progressId);

    if (progress.overallStatus !== 'ON_HOLD') {
      throw new BadRequestException(
        AppMessages.Errors.Onboarding?.CANNOT_RESUME?.message ||
          'Chỉ có thể tiếp tục các tiến trình onboarding đã tạm dừng',
      );
    }

    return this.progressRepository.update(progressId, {
      overallStatus: 'IN_PROGRESS',
      updatedAt: new Date(),
    });
  }

  async findByDepartment(departmentId) {
    return this.progressRepository.findInProgressByDepartment(departmentId);
  }

  async getStatistics() {
    const now = new Date();

    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    const currentStart = new Date(now);
    currentStart.setDate(now.getDate() - 30);
    currentStart.setHours(0, 0, 0, 0);

    const previousStart = new Date(now);
    previousStart.setDate(now.getDate() - 60);
    previousStart.setHours(0, 0, 0, 0);

    const previousEnd = new Date(now);
    previousEnd.setDate(now.getDate() - 31);
    previousEnd.setHours(23, 59, 59, 999);

    const [
      totalProgress,
      inProgressCount,
      completedCount,
      onHoldCount,
      currentNewEmployees,
      previousNewEmployees,
    ] = await Promise.all([
      this.progressRepository.count(),
      this.progressRepository.countByStatus('IN_PROGRESS'),
      this.progressRepository.countByStatus('COMPLETED'),
      this.progressRepository.countByStatus('ON_HOLD'),

      this.employeesRepository.countByCreatedAtRange(currentStart, todayEnd),

      this.employeesRepository.countByCreatedAtRange(
        previousStart,
        previousEnd,
      ),
    ]);

    let growthRate = 0;

    if (previousNewEmployees > 0) {
      growthRate = Math.round(
        ((currentNewEmployees - previousNewEmployees) / previousNewEmployees) *
          100,
      );
    } else if (currentNewEmployees > 0) {
      growthRate = 100;
    }

    return {
      totalOnboardings: totalProgress,
      inProgress: inProgressCount,
      completed: completedCount,
      onHold: onHoldCount,

      averageCompletionRate:
        totalProgress > 0
          ? Math.round((completedCount / totalProgress) * 100)
          : 0,

      newEmployeesLast30Days: currentNewEmployees,
      newEmployeesPrevious30Days: previousNewEmployees,
      growthRate,
    };
  }

  // export progress records to excel file
  async exportExcel() {
    const [progressList] = await this.progressRepository.findAll(0, 10000);
    const data = progressList.map((p, idx) => ({
      index: idx + 1,
      employeeName: p.employee?.fullName || '',
      email: p.employee?.companyEmail || '',
      department: p.employee?.department?.departmentName || '',
      position: p.employee?.position?.positionName || '',
      planName: p.plan?.planName || '',
      startDate: p.startDate ? new Date(p.startDate) : null,
      expectedEndDate: p.expectedEndDate ? new Date(p.expectedEndDate) : null,
      status: p.overallStatus,
      progressPercentage: p.progressPercentage,
    }));

    const columns = [
      { header: 'STT', key: 'index', width: 8 },
      { header: 'Nhân viên', key: 'employeeName', width: 30 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Phòng ban', key: 'department', width: 20 },
      { header: 'Vị trí', key: 'position', width: 20 },
      { header: 'Kế hoạch', key: 'planName', width: 25 },
      { header: 'Bắt đầu', key: 'startDate', width: 15 },
      { header: 'Dự kiến kết thúc', key: 'expectedEndDate', width: 15 },
      { header: 'Trạng thái', key: 'status', width: 15 },
      { header: 'Tiến độ %', key: 'progressPercentage', width: 12 },
    ];

    return ExcelUtil.export(data, columns, 'Tiến trình onboarding');
  }
}
