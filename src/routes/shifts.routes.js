import { Router } from 'express';
import { ShiftGroupsController } from '../controllers/shift-groups.controller.js';
import { WorkingShiftsController } from '../controllers/working-shifts.controller.js';
import { ShiftAssignmentsController } from '../controllers/shift-assignments.controller.js';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { permissionsMiddleware } from '../common/middleware/permissions.middleware.js';

const router = Router();

const shiftGroupsController = new ShiftGroupsController();
const workingShiftsController = new WorkingShiftsController();
const shiftAssignmentsController = new ShiftAssignmentsController();

/**
 * @swagger
 * tags:
 *   name: Shifts
 *   description: Shift and shift group management
 */

// shift groups
router.post(
  '/groups',
  authMiddleware,
  permissionsMiddleware('SHIFT_GROUP_CREATE'),
  shiftGroupsController.create,
);
router.get(
  '/groups',
  authMiddleware,
  permissionsMiddleware('SHIFT_GROUP_READ'),
  shiftGroupsController.findAll,
);
router.get(
  '/groups/:id',
  authMiddleware,
  permissionsMiddleware('SHIFT_GROUP_READ'),
  shiftGroupsController.findOne,
);
router.put(
  '/groups/:id',
  authMiddleware,
  permissionsMiddleware('SHIFT_GROUP_UPDATE'),
  shiftGroupsController.update,
);
router.delete(
  '/groups/:id',
  authMiddleware,
  permissionsMiddleware('SHIFT_GROUP_DELETE'),
  shiftGroupsController.remove,
);

// working shifts
router.post(
  '/',
  authMiddleware,
  permissionsMiddleware('SHIFT_CREATE'),
  workingShiftsController.create,
);
router.get(
  '/',
  authMiddleware,
  permissionsMiddleware('SHIFT_READ'),
  workingShiftsController.findAll,
);
router.get(
  '/:id',
  authMiddleware,
  permissionsMiddleware('SHIFT_READ'),
  workingShiftsController.findOne,
);
router.put(
  '/:id',
  authMiddleware,
  permissionsMiddleware('SHIFT_UPDATE'),
  workingShiftsController.update,
);
router.delete(
  '/:id',
  authMiddleware,
  permissionsMiddleware('SHIFT_DELETE'),
  workingShiftsController.remove,
);

// assignments
router.post(
  '/assign',
  authMiddleware,
  permissionsMiddleware('SHIFT_ASSIGN_CREATE'),
  shiftAssignmentsController.assignToEmployee,
);
router.post(
  '/assign/department',
  authMiddleware,
  permissionsMiddleware('SHIFT_ASSIGN_CREATE'),
  shiftAssignmentsController.assignByDepartment,
);
router.put(
  '/assign/:id',
  authMiddleware,
  permissionsMiddleware('SHIFT_ASSIGN_UPDATE'),
  shiftAssignmentsController.update,
);
router.delete(
  '/assign/:id',
  authMiddleware,
  permissionsMiddleware('SHIFT_ASSIGN_DELETE'),
  shiftAssignmentsController.cancel,
);
router.get(
  '/assignments',
  authMiddleware,
  permissionsMiddleware('SHIFT_ASSIGN_READ'),
  shiftAssignmentsController.list,
);

// schedule view
router.get(
  '/schedule/employee/:employeeId',
  authMiddleware,
  permissionsMiddleware('SHIFT_SCHEDULE_READ'),
  shiftAssignmentsController.viewEmployeeSchedule,
);
router.get(
  '/schedule/department/:departmentId',
  authMiddleware,
  permissionsMiddleware('SHIFT_SCHEDULE_READ'),
  shiftAssignmentsController.viewDepartmentSchedule,
);

export const shiftsRoutes = router;
