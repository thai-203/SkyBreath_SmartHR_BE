import { Router } from 'express';
import { EmployeesController } from '../controllers/employees.controller';
import { authMiddleware } from '../common/middleware/auth.middleware';

const router = Router();
const employeesController = new EmployeesController();

router.get('/list', authMiddleware, employeesController.list);

export const employeesRoutes = router;
