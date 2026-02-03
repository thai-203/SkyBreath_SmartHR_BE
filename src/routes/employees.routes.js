import { Router } from 'express';
import { EmployeesController } from '../controllers/employees.controller.js';
import { authMiddleware } from '../common/middleware/auth.middleware.js';

const router = Router();
const employeesController = new EmployeesController();

router.get('/', authMiddleware, employeesController.all);

router.get('/list', authMiddleware, employeesController.list);

export const employeesRoutes = router;
