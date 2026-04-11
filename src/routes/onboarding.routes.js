import { Router } from 'express';
import { OnboardingPlansController } from '../controllers/onboarding-plans.controller.js';
import { OnboardingProgressController } from '../controllers/onboarding-progress.controller.js';
import { OnboardingTasksController } from '../controllers/onboarding-tasks.controller.js';
import { TaskAssignmentsController } from '../controllers/task-assignments.controller.js';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { rolesMiddleware } from '../common/middleware/roles.middleware.js';
import { permissionsMiddleware } from '../common/middleware/permissions.middleware.js';
import { uploadCloud } from '../common/middleware/upload.middleware.js';

const router = Router();

// Controllers
const plansController = new OnboardingPlansController();
const progressController = new OnboardingProgressController();
const tasksController = new OnboardingTasksController();
const assignmentsController = new TaskAssignmentsController();

// Onboarding Plans Routes
router.get(
  '/plans',
  authMiddleware,
  permissionsMiddleware('ONBOARDING_PLAN_READ'),
  plansController.findAll,
);
router.get(
  '/plans/:id',
  authMiddleware,
  permissionsMiddleware('ONBOARDING_PLAN_READ'),
  plansController.findOne,
);
router.post(
  '/plans',
  authMiddleware,
  permissionsMiddleware('ONBOARDING_PLAN_CREATE'),
  plansController.create,
);
router.put(
  '/plans/:id',
  authMiddleware,
  permissionsMiddleware('ONBOARDING_PLAN_UPDATE'),
  plansController.update,
);
router.delete(
  '/plans/:id',
  authMiddleware,
  permissionsMiddleware('ONBOARDING_PLAN_DELETE'),
  plansController.remove,
);
router.get(
  '/plans/:id/stats',
  authMiddleware,
  permissionsMiddleware('ONBOARDING_PLAN_READ'),
  plansController.getStatistics,
);
router.get(
  '/plans/department/:departmentId',
  authMiddleware,
  permissionsMiddleware('ONBOARDING_PLAN_READ'),
  plansController.findByDepartment,
);
router.get(
  '/plans-templates/list',
  authMiddleware,
  permissionsMiddleware('ONBOARDING_PLAN_READ'),
  plansController.findTemplates,
);
router.post(
  '/plans/:id/duplicate',
  authMiddleware,
  permissionsMiddleware('ONBOARDING_PLAN_CREATE'),
  plansController.duplicate,
);

// Onboarding Progress Routes
router.get(
  '/progress',
  authMiddleware,
  permissionsMiddleware('ONBOARDING_PROGRESS_READ'),
  progressController.findAll,
);
// export progress to excel
router.get(
  '/progress/export',
  authMiddleware,
  permissionsMiddleware('ONBOARDING_PLAN_EXPORT'),
  progressController.export,
);
router.get(
  '/progress/:id',
  authMiddleware,
  permissionsMiddleware('ONBOARDING_PROGRESS_READ'),
  progressController.findOne,
);
router.get(
  '/progress/stats/all',
  authMiddleware,
  permissionsMiddleware('ONBOARDING_PROGRESS_READ'),
  progressController.getStatistics,
);
router.post(
  '/progress',
  authMiddleware,
  permissionsMiddleware('ONBOARDING_PROGRESS_UPDATE'),
  progressController.create,
);
router.put(
  '/progress/:id',
  authMiddleware,
  permissionsMiddleware('ONBOARDING_PROGRESS_UPDATE'),
  progressController.update,
);
router.put(
  '/progress/:id/complete',
  authMiddleware,
  permissionsMiddleware('ONBOARDING_PROGRESS_UPDATE'),
  progressController.complete,
);
router.put(
  '/progress/:id/pause',
  authMiddleware,
  permissionsMiddleware('ONBOARDING_PROGRESS_UPDATE'),
  progressController.pause,
);
router.put(
  '/progress/:id/resume',
  authMiddleware,
  permissionsMiddleware('ONBOARDING_PROGRESS_UPDATE'),
  progressController.resume,
);
router.get(
  '/progress/employee/:employeeId',
  authMiddleware,
  permissionsMiddleware('ONBOARDING_PROGRESS_READ'),
  progressController.findByEmployee,
);
router.get(
  '/progress/department/:departmentId',
  authMiddleware,
  permissionsMiddleware('ONBOARDING_PROGRESS_READ'),
  progressController.findByDepartment,
);

// Onboarding Tasks Routes
router.get(
  '/plans/:planId/tasks',
  authMiddleware,
  permissionsMiddleware('ONBOARDING_TASK_READ'),
  tasksController.getByPlan,
);
router.post(
  '/plans/:planId/tasks',
  authMiddleware,
  permissionsMiddleware('ONBOARDING_TASK_CREATE'),
  tasksController.create,
);
router.put(
  '/tasks/:id',
  authMiddleware,
  permissionsMiddleware('ONBOARDING_TASK_UPDATE'),
  tasksController.update,
);
router.delete(
  '/tasks/:id',
  authMiddleware,
  permissionsMiddleware('ONBOARDING_TASK_DELETE'),
  tasksController.delete,
);

// Task Assignments Routes
router.get('/assignments', authMiddleware, assignmentsController.list);
router.get('/assignments/:id', authMiddleware, assignmentsController.getById);
router.get(
  '/assignments/stats/all',
  authMiddleware,
  assignmentsController.getStats,
);
router.post(
  '/assignments',
  authMiddleware,
  rolesMiddleware(['ADMIN', 'DEPARTMENT_MANAGER']),
  assignmentsController.create,
);
router.put(
  '/assignments/:id',
  uploadCloud.single('evidence'),
  assignmentsController.update,
);
router.put(
  '/assignments/:id/complete',
  authMiddleware,
  assignmentsController.complete,
);
router.put(
  '/assignments/:id/start',
  authMiddleware,
  assignmentsController.start,
);
router.put(
  '/assignments/:id/reassign',
  authMiddleware,
  rolesMiddleware(['ADMIN', 'DEPARTMENT_MANAGER']),
  assignmentsController.reassign,
);
router.delete(
  '/assignments/:id',
  authMiddleware,
  rolesMiddleware(['ADMIN']),
  assignmentsController.delete,
);
router.get(
  '/assignments/progress/:progressId',
  authMiddleware,
  assignmentsController.getByProgress,
);
router.get(
  '/assignments/employee/:employeeId',
  authMiddleware,
  assignmentsController.getByEmployee,
);
router.get(
  '/assignments/status/:status',
  authMiddleware,
  assignmentsController.getByStatus,
);
router.get(
  '/assignments/overdue',
  authMiddleware,
  assignmentsController.getOverdue,
);

export const onboardingRoutes = router;
