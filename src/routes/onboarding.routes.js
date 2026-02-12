import { Router } from 'express';
import { OnboardingPlansController } from '../controllers/onboarding-plans.controller.js';
import { OnboardingProgressController } from '../controllers/onboarding-progress.controller.js';
import { TaskAssignmentsController } from '../controllers/task-assignments.controller.js';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { rolesMiddleware } from '../common/middleware/roles.middleware.js';

const router = Router();

// Controllers
const plansController = new OnboardingPlansController();
const progressController = new OnboardingProgressController();
const assignmentsController = new TaskAssignmentsController();

// Onboarding Plans Routes
router.get('/plans', authMiddleware, plansController.findAll);
router.get('/plans/:id', authMiddleware, plansController.findOne);
router.post('/plans', authMiddleware, rolesMiddleware(['HR_MANAGER']), plansController.create);
router.put('/plans/:id', authMiddleware, rolesMiddleware(['HR_MANAGER']), plansController.update);
router.delete('/plans/:id', authMiddleware, rolesMiddleware(['HR_MANAGER']), plansController.remove);
router.get('/plans/:id/stats', authMiddleware, plansController.getStatistics);
router.get('/plans/department/:departmentId', authMiddleware, plansController.findByDepartment);
router.get('/plans-templates/list', authMiddleware, plansController.findTemplates);
router.post('/plans/:id/duplicate', authMiddleware, rolesMiddleware(['HR_MANAGER']), plansController.duplicate);

// Onboarding Progress Routes
router.get('/progress', authMiddleware, progressController.findAll);
router.get('/progress/:id', authMiddleware, progressController.findOne);
router.get('/progress/stats/all', authMiddleware, progressController.getStatistics);
router.post('/progress', authMiddleware, rolesMiddleware(['HR_MANAGER']), progressController.create);
router.put('/progress/:id', authMiddleware, progressController.update);
router.put('/progress/:id/complete', authMiddleware, rolesMiddleware(['HR_MANAGER']), progressController.complete);
router.put('/progress/:id/pause', authMiddleware, rolesMiddleware(['HR_MANAGER']), progressController.pause);
router.put('/progress/:id/resume', authMiddleware, rolesMiddleware(['HR_MANAGER']), progressController.resume);
router.get('/progress/employee/:employeeId', authMiddleware, progressController.findByEmployee);
router.get('/progress/department/:departmentId', authMiddleware, progressController.findByDepartment);

// Task Assignments Routes
router.get('/assignments', authMiddleware, assignmentsController.list);
router.get('/assignments/:id', authMiddleware, assignmentsController.getById);
router.get('/assignments/stats/all', authMiddleware, assignmentsController.getStats);
router.post('/assignments', authMiddleware, rolesMiddleware(['HR_MANAGER', 'DEPARTMENT_MANAGER']), assignmentsController.create);
router.put('/assignments/:id', authMiddleware, rolesMiddleware(['HR_MANAGER', 'DEPARTMENT_MANAGER']), assignmentsController.update);
router.put('/assignments/:id/complete', authMiddleware, assignmentsController.complete);
router.put('/assignments/:id/start', authMiddleware, assignmentsController.start);
router.put('/assignments/:id/reassign', authMiddleware, rolesMiddleware(['HR_MANAGER', 'DEPARTMENT_MANAGER']), assignmentsController.reassign);
router.delete('/assignments/:id', authMiddleware, rolesMiddleware(['HR_MANAGER']), assignmentsController.delete);
router.get('/assignments/progress/:progressId', authMiddleware, assignmentsController.getByProgress);
router.get('/assignments/employee/:employeeId', authMiddleware, assignmentsController.getByEmployee);
router.get('/assignments/status/:status', authMiddleware, assignmentsController.getByStatus);
router.get('/assignments/overdue', authMiddleware, assignmentsController.getOverdue);


export const onboardingRoutes = router;
