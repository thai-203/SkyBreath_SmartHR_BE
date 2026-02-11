import { Router } from 'express';
import { EmployeesController } from '../controllers/employees.controller.js';
import { EmployeesService } from '../services/employees.service.js';
import { EmployeesRepository } from '../repositories/employees.repository.js';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { permissionsMiddleware } from '../common/middleware/permissions.middleware.js';
import { upload } from '../common/middleware/upload.middleware.js';

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
router.get('/meta-data', authMiddleware, permissionsMiddleware('Employee.View'), employeesController.getMetadata);
router.get('/list', authMiddleware, permissionsMiddleware('Employee.View'), employeesController.list);
router.get('/', authMiddleware, permissionsMiddleware('Employee.View'), employeesController.all);
router.get('/validation-data', authMiddleware, permissionsMiddleware('Employee.View'), employeesController.getValidationData);
router.get('/:id', authMiddleware, permissionsMiddleware('Employee.View'), employeesController.findOne);

// Export permission
router.get('/export', authMiddleware, permissionsMiddleware('EMPLOYEE_EXPORT'), employeesController.export);

// Create permission
router.post('/', authMiddleware, permissionsMiddleware('Employee.Create'), upload.fields([
    { name: 'frontIdCard', maxCount: 1 },
    { name: 'backIdCard', maxCount: 1 }
]), employeesController.create);

// Update permission
router.put('/:id', authMiddleware, permissionsMiddleware('EMPLOYEE_UPDATE'), upload.fields([
    { name: 'frontIdCard', maxCount: 1 },
    { name: 'backIdCard', maxCount: 1 }
]), employeesController.update);

// Delete permission
router.delete('/:id', authMiddleware, permissionsMiddleware('EMPLOYEE_DELETE'), employeesController.delete);

export const employeesRoutes = router;
