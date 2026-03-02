/**
 * Shift Management Routes
 * Định nghĩa tất cả các route cho quản lý ca làm việc
 */

const express = require('express');
const ShiftGroupController = require('../controllers/shiftGroup.controller');
const WorkShiftController = require('../controllers/workShift.controller');
const ShiftAssignmentController = require('../controllers/shiftAssignment.controller');

const router = express.Router();

// Initialize controllers (these will receive the database instance)
const initializeShiftRoutes = (db) => {
  const shiftGroupController = new ShiftGroupController(db);
  const workShiftController = new WorkShiftController(db);
  const shiftAssignmentController = new ShiftAssignmentController(db);

  // ==================== Shift Group Routes ====================

  /**
   * POST /api/shift-groups
   * UC12: Create Shift Group
   */
  router.post('/shift-groups', (req, res) => shiftGroupController.create(req, res));

  /**
   * GET /api/shift-groups
   * Lấy danh sách nhóm ca
   */
  router.get('/shift-groups', (req, res) => shiftGroupController.getAll(req, res));

  /**
   * GET /api/shift-groups/:id
   * UC12: View Shift Group Details
   */
  router.get('/shift-groups/:id', (req, res) => shiftGroupController.getById(req, res));

  /**
   * GET /api/shift-groups/:id/details
   * Lấy chi tiết nhóm ca cùng danh sách ca làm việc
   */
  router.get('/shift-groups/:id/details', (req, res) => shiftGroupController.getDetails(req, res));

  /**
   * PUT /api/shift-groups/:id
   * UC12: Edit Shift Group
   */
  router.put('/shift-groups/:id', (req, res) => shiftGroupController.update(req, res));

  /**
   * DELETE /api/shift-groups/:id
   * UC12: Delete Shift Group
   */
  router.delete('/shift-groups/:id', (req, res) => shiftGroupController.delete(req, res));

  // ==================== Work Shift Routes ====================

  /**
   * POST /api/work-shifts
   * UC13: Create Working Shift
   */
  router.post('/work-shifts', (req, res) => workShiftController.create(req, res));

  /**
   * GET /api/shift-groups/:shiftGroupId/work-shifts
   * Lấy danh sách ca làm việc theo nhóm ca
   */
  router.get('/shift-groups/:shiftGroupId/work-shifts', (req, res) => 
    workShiftController.getByGroup(req, res)
  );

  /**
   * GET /api/work-shifts/:id
   * UC13: View Working Shift Details
   */
  router.get('/work-shifts/:id', (req, res) => workShiftController.getById(req, res));

  /**
   * PUT /api/work-shifts/:id
   * UC13: Edit Working Shift
   */
  router.put('/work-shifts/:id', (req, res) => workShiftController.update(req, res));

  /**
   * DELETE /api/work-shifts/:id
   * UC13: Delete Working Shift
   */
  router.delete('/work-shifts/:id', (req, res) => workShiftController.delete(req, res));

  // ==================== Shift Assignment Routes ====================

  /**
   * POST /api/shift-assignments/employee
   * UC14: Assign Shift to Employee
   */
  router.post('/shift-assignments/employee', (req, res) => 
    shiftAssignmentController.assignToEmployee(req, res)
  );

  /**
   * POST /api/shift-assignments/department
   * UC14: Assign Shift by Department
   */
  router.post('/shift-assignments/department', (req, res) => 
    shiftAssignmentController.assignToDepartment(req, res)
  );

  /**
   * GET /api/shift-assignments/:id
   * Lấy chi tiết phân ca
   */
  router.get('/shift-assignments/:id', (req, res) => shiftAssignmentController.getById(req, res));

  /**
   * PUT /api/shift-assignments/:id
   * UC14: Update Shift Assignment
   */
  router.put('/shift-assignments/:id', (req, res) => shiftAssignmentController.update(req, res));

  /**
   * DELETE /api/shift-assignments/:id
   * UC14: Cancel Shift Assignment
   */
  router.delete('/shift-assignments/:id', (req, res) => shiftAssignmentController.cancel(req, res));

  // ==================== Shift Schedule Viewing Routes ====================

  /**
   * GET /api/employees/:employeeId/shift-schedule
   * UC15: View Employee Shift Schedule
   */
  router.get('/employees/:employeeId/shift-schedule', (req, res) => 
    shiftAssignmentController.getEmployeeSchedule(req, res)
  );

  /**
   * GET /api/departments/:departmentId/shift-schedule
   * UC15: View Department Shift Schedule
   */
  router.get('/departments/:departmentId/shift-schedule', (req, res) => 
    shiftAssignmentController.getDepartmentSchedule(req, res)
  );

  return router;
};

module.exports = initializeShiftRoutes;
