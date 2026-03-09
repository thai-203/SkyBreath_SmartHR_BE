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

export class OnboardingPlansService {
  constructor() {
    this.plansRepository = new OnboardingPlansRepository();
    this.progressRepository = new OnboardingProgressRepository();
    this.tasksRepository = new OnboardingTasksRepository();
    this.taskAssignmentsRepository = new TaskAssignmentsRepository();
    this.EmployeesRepository = new EmployeesRepository();
  }

  async findAll(queryDto) {
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

      if (!data.startDate) {
        throw new BadRequestException('Ngày bắt đầu là thông tin bắt buộc');
      }
      const startDateCheck = new Date(data.startDate);
      if (isNaN(startDateCheck.getTime())) {
        throw new BadRequestException('Ngày bắt đầu không hợp lệ');
      }

      // attempt to populate department/position from employee if missing
      if (!data.departmentId || !data.positionId) {
        const emp = await new EmployeesRepository().findById(data.employeeId);
        if (emp) {
          data.departmentId = data.departmentId || emp.departmentId;
          data.positionId = data.positionId || emp.positionId;
        }
      }
      // after autofill, ensure they exist
      if (!data.departmentId || !data.positionId) {
        throw new BadRequestException('Phòng ban và chức vụ không được để trống');
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

      const employee = await new EmployeesRepository().findById(
        data.employeeId,
      );
      if (employee) {
        await this.EmployeesRepository.update(data.employeeId, {
          planId: plan.id,
        });
      } else {
        throw new BadRequestException(
          `Nhân viên với ID ${data.employeeId} không được tìm thấy`,
        );
      }
    }

    return plan;
  }

  async update(id, dto) {
    const plan = await this.plansRepository.findById(id);

    if (!plan) {
      throw new Error('Kế hoạch onboarding không được tìm thấy');
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

    Object.assign(plan, {
      description: dto.description,
      departmentId: dto.departmentId,
      positionId: dto.positionId,
      isTemplate: dto.isTemplate,
      durationDays: dto.durationDays,
      status: dto.status,
    });

    // if template flag toggled on, require department & position
    if (plan.isTemplate) {
      if (!plan.departmentId || !plan.positionId) {
        throw new BadRequestException(
          'Thông tin về phòng ban và chức vụ là bắt buộc đối với mẫu kế hoạch',
        );
      }
    }

    await this.plansRepository.save(plan);

    const existingTasks = await this.tasksRepository.findByPlanId(plan.id);

    const incomingTaskIds = (dto.tasks || [])
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

    for (const taskDto of dto.tasks || []) {
      if (taskDto.id) {
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
