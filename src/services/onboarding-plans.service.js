import { AppMessages } from '../common/constants/index.js';
import { PaginatedResponseDto } from '../common/dto/index.js';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '../common/exceptions/index.js';
import { EmployeesRepository } from '../repositories/employees.repository.js';
import { OnboardingPlansRepository } from '../repositories/onboarding-plans.repository.js';
import { OnboardingProgressRepository } from '../repositories/onboarding-progress.repository.js';
import { OnboardingTasksRepository } from '../repositories/onboarding-tasks.repository.js';
import { TaskAssignmentsRepository } from '../repositories/task-assignments.repository.js';
import { NotificationsService } from './notifications.service.js';

export class OnboardingPlansService {
  constructor() {
    this.plansRepository = new OnboardingPlansRepository();
    this.progressRepository = new OnboardingProgressRepository();
    this.tasksRepository = new OnboardingTasksRepository();
    this.taskAssignmentsRepository = new TaskAssignmentsRepository();
    this.EmployeesRepository = new EmployeesRepository();
    this.notificationsService = new NotificationsService();
  }

  async findAll(queryDto) {
    // if employeeId filter is provided, bypass normal pagination and return the
    // single plan assigned to that employee (if any). this allows the frontend
    // to call /plans?employeeId=123 and receive either one plan or an empty
    // result without needing a separate route.
    if (queryDto.employeeId) {
      const progress = await this.progressRepository.findByEmployeeId(
        queryDto.employeeId,
      );
      if (!progress) {
        return new PaginatedResponseDto([], 0, queryDto);
      }
      const plan = await this.plansRepository.findById(progress.planId);
      if (!plan) {
        return new PaginatedResponseDto([], 0, queryDto);
      }
      return new PaginatedResponseDto([plan], 1, queryDto);
    }

    const [plans, total] = await Promise.all([
      this.plansRepository.findAll(queryDto.skip, queryDto.limit),
      this.plansRepository.count(),
    ]);
    return new PaginatedResponseDto(plans, total, queryDto);
  }

  async findById(planId) {
    const plan = await this.plansRepository.findById(planId);
    if (!plan) {
      throw new NotFoundException(
        AppMessages.Errors.Onboarding?.PLAN_NOT_FOUND?.message ||
          `Không tìm thấy kế hoạch onboarding có ID ${planId}`,
      );
    }
    return plan;
  }

  async findByDepartment(departmentId) {
    return this.plansRepository.findByDepartmentId(departmentId);
  }

  async findTemplates() {
    return this.plansRepository.findTemplates({
      where: {
        isTemplate: true,
        isDeleted: false,
      },
      relations: ['tasks', 'department', 'position'],
    });
  }

  async create(data, userId) {
    // ===== 1. Validate plan name =====
    if (!data.planName || data.planName.trim().length === 0) {
      throw new BadRequestException(
        AppMessages.Errors.Onboarding?.PLAN_NAME_REQUIRED?.message ||
          'Tên kế hoạch là bắt buộc',
      );
    }

    const isTemplate = data.isTemplate === true || data.isTemplate === 1;

    // ===== 2. Early non-template validation =====
    if (!isTemplate) {
      if (!data.employeeId) {
        throw new BadRequestException(
          'Nhân viên là thông tin bắt buộc cho kế hoạch',
        );
      }

      // ---- Prevent duplicate onboarding for the same employee ----
      const existingOnboarding = await this.progressRepository.findByEmployeeId(
        data.employeeId,
      );
      if (existingOnboarding) {
        throw new ConflictException(
          'Nhân viên này đã có kế hoạch onboarding đang tồn tại',
        );
      }

      const emp = await this.EmployeesRepository.findById(data.employeeId);
      if (!emp) {
        throw new NotFoundException(AppMessages.Errors.Employee.NOT_FOUND);
      }

      if (
        String(emp.employmentStatus || '')
          .trim()
          .toUpperCase() === 'INACTIVE'
      ) {
        throw new BadRequestException(
          'Không thể tạo kế hoạch onboarding cho nhân viên không còn hoạt động',
        );
      }

      if (!data.startDate) {
        throw new BadRequestException('Ngày bắt đầu là thông tin bắt buộc');
      }
      const startDateCheck = new Date(data.startDate);
      if (isNaN(startDateCheck.getTime())) {
        throw new BadRequestException('Ngày bắt đầu không hợp lệ');
      }

      // attempt to populate department/position from employee if missing
      if (!data.departmentId || !data.positionId) {
        if (emp) {
          data.departmentId = data.departmentId || emp.departmentId;
          data.positionId = data.positionId || emp.positionId;
        }
      }
      // after autofill, ensure they exist
      if (!data.departmentId || !data.positionId) {
        throw new BadRequestException(
          'Phòng ban và chức vụ không được để trống',
        );
      }
    }

    // extra validation for numeric IDs and status (treat empty strings earlier)
    if (data.departmentId !== undefined && data.departmentId !== null) {
      const dep = Number(data.departmentId);
      if (isNaN(dep) || dep < 1) {
        throw new BadRequestException('ID phòng ban không hợp lệ');
      }
    }
    if (data.positionId !== undefined && data.positionId !== null) {
      const pos = Number(data.positionId);
      if (isNaN(pos) || pos < 1) {
        throw new BadRequestException('ID chức vụ không hợp lệ');
      }
    }
    if (data.status !== undefined && data.status !== null) {
      const statusVal = String(data.status).toUpperCase();
      if (!['ACTIVE', 'DRAFT'].includes(statusVal)) {
        throw new BadRequestException('Trạng thái không hợp lệ');
      }
      data.status = statusVal;
    }

    // ===== 3. Validate template =====
    if (isTemplate) {
      if (!data.departmentId || !data.positionId) {
        throw new BadRequestException(
          'Phòng ban và chức vụ là thông tin bắt buộc đối với mẫu kế hoạch.',
        );
      }

      const existingTemplate =
        await this.plansRepository.findTemplateByDepartmentAndPosition(
          data.departmentId,
          data.positionId,
        );

      if (existingTemplate) {
        throw new ConflictException(
          AppMessages.Errors.Onboarding.TEMPLATE_ALREADY_EXISTS,
        );
      }
    }

    // ===== 4. Create plan =====
    const plan = await this.plansRepository.create({
      ...data,
      status: data.status || 'ACTIVE',
      createdAt: new Date(),
    });

    // ===== 5. Non-template: create progress & task assignments =====
    if (!isTemplate) {
      // progress creation assumes previous validation done above
      const startDate = new Date(data.startDate);

      const expectedEndDate = new Date(startDate);
      expectedEndDate.setDate(
        startDate.getDate() + Number(data.durationDays || 0),
      );

      const progress = await this.progressRepository.create({
        planId: plan.id,
        employeeId: data.employeeId,
        overallStatus: 'NOT_STARTED',
        startDate,
        expectedEndDate,
        actualEndDate: null,
        progressPercentage: 0,
        completedTasksCount: 0,
        totalTasksCount: data.tasks?.length || 0,
        assignedMentorId: null,
        createdAt: new Date(),
      });

      // ---- 4.2 Map task DTO by taskOrder ----
      const taskDtoMap = new Map(
        (data.tasks || []).map((t) => [t.taskOrder, t]),
      );

      // ---- 4.3 Get tasks from DB ----
      const tasks = await this.tasksRepository.findByPlanId(plan.id);

      // ---- 4.4 Create task assignments ----
      for (const task of tasks) {
        const taskDTO = taskDtoMap.get(task.taskOrder);

        if (!taskDTO) {
          throw new BadRequestException(
            `Thiếu DTO tác vụ cho taskOrder ${task.taskOrder}`,
          );
        }

        let dueDate;

        // ✅ ưu tiên dueDate từ frontend
        if (taskDTO.dueDate) {
          dueDate = new Date(taskDTO.dueDate);
        }
        // 🔁 fallback bằng estimatedDays
        else if (taskDTO.estimatedDays) {
          dueDate = new Date(startDate);
          dueDate.setDate(dueDate.getDate() + Number(taskDTO.estimatedDays));
        }

        // 🚨 validate dueDate
        if (!dueDate || isNaN(dueDate.getTime())) {
          throw new BadRequestException(
            `Ngày đáo hạn không hợp lệ cho tác vụ "${task.description}"`,
          );
        }

        await this.taskAssignmentsRepository.create({
          progressId: progress.id,
          taskId: task.id,
          assignedToEmployeeId: data.employeeId,
          assignedByUserId: userId,
          status: 'PENDING',
          assignedDate: new Date(),
          dueDate,
          createdAt: new Date(),
        });
      }

      const employee = await this.EmployeesRepository.findById(data.employeeId);
      if (employee) {
        await this.EmployeesRepository.update(data.employeeId, {
          planId: plan.id,
        });
        try {
          const recipientUserId = Number(employee?.userId);
          if (Number.isFinite(recipientUserId) && recipientUserId > 0) {
            await this.notificationsService.createAndNotify({
              title: 'Bạn có kế hoạch onboarding mới',
              message: `Kế hoạch onboarding "${plan.planName || ''}" đã được tạo cho bạn. Vui lòng kiểm tra chi tiết trong phần Onboarding.`,
              notificationType: 'WORKFLOW',
              link: '/onboardings/employee',
              recipientUserIds: [recipientUserId],
            });
          }
        } catch (notificationError) {
          console.error(
            '[OnboardingPlansService] Failed to send onboarding notification:',
            notificationError,
          );
        }
      } else {
        throw new BadRequestException(
          `Nhân viên với ID ${data.employeeId} không được tìm thấy`,
        );
      }
    }

    return plan;
  }

  async update(id, dto, userId = null) {
    const plan = await this.plansRepository.findById(id);

    if (!plan) {
      throw new Error('Kế hoạch onboarding không được tìm thấy');
    }

    let linkedProgress = null;
    if (!plan.isTemplate) {
      const progressRecords = await this.progressRepository.findAll({
        planId: id,
        skip: 0,
        take: 100,
      });
      linkedProgress = progressRecords?.[0] || null;

      if (linkedProgress && linkedProgress.overallStatus !== 'NOT_STARTED') {
        throw new BadRequestException(
          'Chỉ có thể chỉnh sửa kế hoạch khi onboarding chưa bắt đầu',
        );
      }
    }

    // validate planName if provided
    if (dto.planName !== undefined) {
      if (!dto.planName || String(dto.planName).trim().length === 0) {
        throw new BadRequestException('Tên kế hoạch không được để trống');
      }
      plan.planName = dto.planName;
    }

    // validate optional numeric IDs and status
    if (dto.departmentId !== undefined && dto.departmentId !== null) {
      const dep = Number(dto.departmentId);
      if (isNaN(dep) || dep < 1) {
        throw new BadRequestException('ID phòng ban không hợp lệ');
      }
    }
    if (dto.positionId !== undefined && dto.positionId !== null) {
      const pos = Number(dto.positionId);
      if (isNaN(pos) || pos < 1) {
        throw new BadRequestException('ID chức vụ không hợp lệ');
      }
    }
    if (dto.status !== undefined && dto.status !== null) {
      const statusVal = String(dto.status).toUpperCase();
      if (!['ACTIVE', 'DRAFT'].includes(statusVal)) {
        throw new BadRequestException('Trạng thái không hợp lệ');
      }
      dto.status = statusVal;
    }

    const patchData = {};
    if (dto.description !== undefined) patchData.description = dto.description;
    if (dto.departmentId !== undefined)
      patchData.departmentId = dto.departmentId;
    if (dto.positionId !== undefined) patchData.positionId = dto.positionId;
    if (dto.isTemplate !== undefined) patchData.isTemplate = dto.isTemplate;
    if (dto.durationDays !== undefined)
      patchData.durationDays = dto.durationDays;
    if (dto.status !== undefined) patchData.status = dto.status;

    Object.assign(plan, patchData);

    // if template flag toggled on, require department & position
    if (plan.isTemplate) {
      if (!plan.departmentId || !plan.positionId) {
        throw new BadRequestException(
          'Thông tin về phòng ban và chức vụ là bắt buộc đối với mẫu kế hoạch',
        );
      }
    }

    await this.plansRepository.save(plan);

    const effectiveStartDate = dto.startDate
      ? new Date(dto.startDate)
      : linkedProgress?.startDate
        ? new Date(linkedProgress.startDate)
        : null;

    if (linkedProgress && effectiveStartDate) {
      const expectedEndDate = new Date(effectiveStartDate);
      expectedEndDate.setDate(
        expectedEndDate.getDate() +
          Number(dto.durationDays ?? plan.durationDays ?? 0),
      );

      await this.progressRepository.update(linkedProgress.id, {
        startDate: effectiveStartDate,
        expectedEndDate,
        totalTasksCount: Array.isArray(dto.tasks)
          ? dto.tasks.length
          : linkedProgress.totalTasksCount,
        updatedAt: new Date(),
      });
    }

    if (!Array.isArray(dto.tasks)) {
      return plan;
    }

    const existingTasks = await this.tasksRepository.findByPlanId(plan.id);
    const existingTaskIdSet = new Set(
      existingTasks.map((task) => Number(task.id)),
    );

    const incomingTaskIds = dto.tasks
      .filter((t) => t.id)
      .map((t) => Number(t.id));

    const tasksToDelete = existingTasks.filter(
      (task) => !incomingTaskIds.includes(task.id),
    );

    if (tasksToDelete.length) {
      await this.tasksRepository.update(
        tasksToDelete.map((t) => t.id),
        { isDeleted: true, deletedAt: new Date() },
      );
    }

    for (const taskDto of dto.tasks) {
      const taskId = Number(taskDto.id);
      const isExistingTask = taskDto.id && existingTaskIdSet.has(taskId);

      if (isExistingTask) {
        await this.tasksRepository.update(taskDto.id, {
          description: taskDto.description,
          category: taskDto.category,
          estimatedDays: taskDto.estimatedDays,
          isMandatory: taskDto.isMandatory,
          responsibleDepartmentId: taskDto.responsibleDepartmentId,
          taskOrder: taskDto.taskOrder,
        });
      } else {
        const newTask = this.tasksRepository.create({
          description: taskDto.description,
          category: taskDto.category,
          estimatedDays: taskDto.estimatedDays,
          isMandatory: taskDto.isMandatory,
          responsibleDepartmentId: taskDto.responsibleDepartmentId,
          taskOrder: taskDto.taskOrder,
          plan: { id: plan.id },
        });

        await this.tasksRepository.save(newTask);
      }
    }

    if (linkedProgress) {
      const refreshedTasks = await this.tasksRepository.findByPlanId(plan.id);
      const refreshedAssignments =
        await this.taskAssignmentsRepository.findByProgressId(
          linkedProgress.id,
        );
      const assignmentMap = new Map(
        refreshedAssignments.map((assignment) => [
          assignment.taskId,
          assignment,
        ]),
      );
      const taskIdSet = new Set(refreshedTasks.map((task) => task.id));

      let accumulatedDays = 0;
      for (const task of refreshedTasks) {
        accumulatedDays += Number(task.estimatedDays || 1);
        const dueDate = effectiveStartDate
          ? new Date(effectiveStartDate)
          : null;

        if (dueDate) {
          dueDate.setDate(dueDate.getDate() + accumulatedDays);
        }

        const existingAssignment = assignmentMap.get(task.id);

        if (existingAssignment) {
          await this.taskAssignmentsRepository.update(existingAssignment.id, {
            assignedToEmployeeId: linkedProgress.employeeId,
            dueDate,
            status: existingAssignment.status || 'PENDING',
            updatedAt: new Date(),
          });
        } else {
          await this.taskAssignmentsRepository.create({
            progressId: linkedProgress.id,
            taskId: task.id,
            assignedToEmployeeId: linkedProgress.employeeId,
            assignedByUserId: userId || plan.createdBy,
            status: 'PENDING',
            assignedDate: new Date(),
            dueDate,
            createdAt: new Date(),
          });
        }
      }

      const assignmentsToRemove = refreshedAssignments.filter(
        (assignment) => !taskIdSet.has(assignment.taskId),
      );

      for (const assignment of assignmentsToRemove) {
        await this.taskAssignmentsRepository.delete(assignment.id);
      }

      await this.progressRepository.update(linkedProgress.id, {
        completedTasksCount: 0,
        progressPercentage: 0,
        updatedAt: new Date(),
      });
    }

    return plan;
  }

  async remove(planId) {
    await this.findById(planId);
    await this.tasksRepository.deleteByPlanId(planId);
    return this.plansRepository.delete(planId);
  }

  async duplicate(planId, newPlanName) {
    const plan = await this.findById(planId);
    const newPlan = {
      planName: newPlanName || `${plan.planName} (Copy)`,
      description: plan.description,
      durationDays: plan.durationDays,
      departmentId: plan.departmentId,
      positionId: plan.positionId,
      isTemplate: plan.isTemplate,
      tasks: plan.tasks?.map((task) => ({
        ...task,
        id: undefined,
        createdAt: undefined,
        updatedAt: undefined,
      })),
    };
    return this.plansRepository.create(newPlan);
  }

  async getStatistics(planId) {
    const plan = await this.findById(planId);
    const progressRecords = await this.progressRepository.findAll(0, 1000);
    const planProgressRecords = progressRecords.plans.filter(
      (p) => p.planId === planId,
    );

    return {
      planId,
      planName: plan.planName,
      totalTasksPerPlan: plan.tasks?.length || 0,
      activeOnboardings: planProgressRecords.filter(
        (p) => p.overallStatus === 'IN_PROGRESS',
      ).length,
      completedOnboardings: planProgressRecords.filter(
        (p) => p.overallStatus === 'COMPLETED',
      ).length,
      onHoldOnboardings: planProgressRecords.filter(
        (p) => p.overallStatus === 'ON_HOLD',
      ).length,
    };
  }
}
