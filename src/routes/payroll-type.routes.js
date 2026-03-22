import { Router } from 'express';
import { PayrollTypeController } from '../controllers/payroll-type.controller.js';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { permissionsMiddleware } from '../common/middleware/permissions.middleware.js';

const router = Router();
const payrollTypeController = new PayrollTypeController();

router.use(authMiddleware);

router.get(
    '/',
    permissionsMiddleware('PAYROLL_TYPE_READ'),
    payrollTypeController.getAll
);

router.get(
    '/:id',
    permissionsMiddleware('PAYROLL_TYPE_READ'),
    payrollTypeController.getById
);

router.post(
    '/',
    permissionsMiddleware('PAYROLL_TYPE_CREATE'),
    payrollTypeController.create
);

router.put(
    '/:id',
    permissionsMiddleware('PAYROLL_TYPE_UPDATE'),
    payrollTypeController.update
);

router.delete(
    '/:id',
    permissionsMiddleware('PAYROLL_TYPE_DELETE'),
    payrollTypeController.delete
);

export const payrollTypeRoutes = router;
