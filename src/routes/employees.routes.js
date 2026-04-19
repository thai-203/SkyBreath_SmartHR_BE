import { Router } from 'express';
import { EmployeesController } from '../controllers/employees.controller.js';
import { EmployeesService } from '../services/employees.service.js';
import { EmployeesRepository } from '../repositories/employees.repository.js';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { permissionsMiddleware } from '../common/middleware/permissions.middleware.js';
import { uploadCloud } from '../common/middleware/upload.middleware.js';

const router = Router();

// Dependency Injection
const employeesRepository = new EmployeesRepository();
const employeesService = new EmployeesService(employeesRepository);
const employeesController = new EmployeesController(employeesService);

/**
 * @swagger
 * tags:
 *   name: Employees
 *   description: Employee management endpoints
 */

// View permissions
router.get(
  '/meta-data',
  authMiddleware,
  permissionsMiddleware('EMPLOYEE_READ'),
  employeesController.getMetadata,
);
router.get(
  '/list',
  authMiddleware,
  employeesController.list,
);
router.get(
  '/no-plan',
  authMiddleware,
  permissionsMiddleware('ONBOARDING_PLAN_READ'),
  employeesController.getEmployeeNoPlanId,
);
router.get('/user/:userId', authMiddleware, employeesController.getByUserId);
router.get(
  '/',
  authMiddleware,
  permissionsMiddleware('EMPLOYEE_READ'),
  employeesController.all,
);
router.get(
  '/public',
  authMiddleware,
  employeesController.all,
);

router.get(
  '/validation-data',
  authMiddleware,
  permissionsMiddleware('EMPLOYEE_READ'),
  employeesController.getValidationData,
);
router.get(
  '/:id',
  authMiddleware,
  permissionsMiddleware('EMPLOYEE_READ'),
  employeesController.findOne,
);

// Export permission
router.get(
  '/export',
  authMiddleware,
  permissionsMiddleware('EMPLOYEE_EXPORT'),
  employeesController.export,
);

// Create permission
router.post(
  '/',
  authMiddleware,
  permissionsMiddleware('EMPLOYEE_CREATE'),
  uploadCloud.fields([
    { name: 'frontIdCard', maxCount: 1 },
    { name: 'backIdCard', maxCount: 1 },
  ]),
  employeesController.create,
);

// Update permission
router.put(
  '/:id',
  authMiddleware,
  permissionsMiddleware('EMPLOYEE_UPDATE'),
  uploadCloud.fields([
    { name: 'frontIdCard', maxCount: 1 },
    { name: 'backIdCard', maxCount: 1 },
  ]),
  employeesController.update,
);

// Delete permission
router.delete(
  '/:id',
  authMiddleware,
  permissionsMiddleware('EMPLOYEE_DELETE'),
  employeesController.delete,
);

export const employeesRoutes = router;
