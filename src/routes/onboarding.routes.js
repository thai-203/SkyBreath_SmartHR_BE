import { Router } from 'express';
import { OnboardingPlansController } from '../controllers/onboarding-plans.controller.js';
import { OnboardingProgressController } from '../controllers/onboarding-progress.controller.js';
import { OnboardingTasksController } from '../controllers/onboarding-tasks.controller.js';
import { TaskAssignmentsController } from '../controllers/task-assignments.controller.js';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
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

router.get(
  '/progress/personal',
  authMiddleware,
  permissionsMiddleware('ONBOARDING_PROGRESS_READ_OWN'),
  progressController.findOwnProgress,
);
// export progress to excel
router.get(
  '/progress/export',
  authMiddleware,
  permissionsMiddleware('ONBOARDING_PROGRESS_EXPORT'),
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
  permissionsMiddleware('ONBOARDING_PROGRESS_CREATE'),
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
  permissionsMiddleware('ONBOARDING_PROGRESS_COMPLETE'),
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
  permissionsMiddleware('ONBOARDING_PROGRESS_'),
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
  permissionsMiddleware('ONBOARDING_PLAN_READ'),
  tasksController.getByPlan,
);
router.post(
  '/plans/:planId/tasks',
  authMiddleware,
  // permissionsMiddleware('ONBOARDING_PLAN_MANAGE'),
  tasksController.create,
);
router.put(
  '/tasks/:id',
  authMiddleware,
  permissionsMiddleware('ONBOARDING_PLAN_UPDATE'),
  tasksController.update,
);
router.delete(
  '/tasks/:id',
  authMiddleware,
  // permissionsMiddleware('ONBOARDING_PLAN_MANAGE'),
  tasksController.delete,
);

// Task Assignments Routes
router.get(
  '/assignments',
  authMiddleware,
  permissionsMiddleware('ONBOARDING_PROGRESS_READ'),
  assignmentsController.list,
);
router.get('/assignments/:id', authMiddleware, assignmentsController.getById);
router.get(
  '/assignments/stats/all',
  authMiddleware,
  permissionsMiddleware('ONBOARDING_PROGRESS_READ'),
  assignmentsController.getStats,
);
router.post(
  '/assignments',
  authMiddleware,
  // permissionsMiddleware('ONBOARDING_PROGRESS_MANAGE'),
  assignmentsController.create,
);
router.put(
  '/assignments/:id',
<<<<<<< HEAD
  uploadCloud.single('evidence'),
=======
  authMiddleware,
  // permissionsMiddleware([
  //   'ONBOARDING_PROGRESS_MANAGE',
  //   'ONBOARDING_PROGRESS_UPDATE_OWN',
  // ]),
  upload.single('evidence'),
>>>>>>> cd76d22 (add rbac)
  assignmentsController.update,
);
router.put(
  '/assignments/:id/complete',
  authMiddleware,
  // permissionsMiddleware('ONBOARDING_PROGRESS_MANAGE'),

  assignmentsController.complete,
);
router.put(
  '/assignments/:id/start',
  authMiddleware,
  permissionsMiddleware('ONBOARDING_PROGRESS_MANAGE'),
  assignmentsController.start,
);
router.put(
  '/assignments/:id/reassign',
  authMiddleware,
  permissionsMiddleware('ONBOARDING_PROGRESS_MANAGE'),
  assignmentsController.reassign,
);
router.delete(
  '/assignments/:id',
  authMiddleware,
  permissionsMiddleware('ONBOARDING_PROGRESS_MANAGE'),
  assignmentsController.delete,
);
router.get(
  '/assignments/progress/:progressId',
  authMiddleware,
  permissionsMiddleware('ONBOARDING_PROGRESS_READ'),
  assignmentsController.getByProgress,
);
router.get(
  '/assignments/employee/:employeeId',
  authMiddleware,
  permissionsMiddleware('ONBOARDING_PROGRESS_READ'),
  assignmentsController.getByEmployee,
);
router.get(
  '/assignments/status/:status',
  authMiddleware,
  permissionsMiddleware('ONBOARDING_PROGRESS_READ'),
  assignmentsController.getByStatus,
);
router.get(
  '/assignments/overdue',
  authMiddleware,
  permissionsMiddleware('ONBOARDING_PROGRESS_READ'),
  assignmentsController.getOverdue,
);

export const onboardingRoutes = router;
