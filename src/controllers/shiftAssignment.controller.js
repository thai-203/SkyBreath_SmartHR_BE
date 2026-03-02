/**
 * Shift Assignment Controller
 * Xử lý các request HTTP cho phân ca
 */

const ShiftAssignmentService = require('../services/shiftAssignment.service');

class ShiftAssignmentController {
  constructor(db) {
    this.service = new ShiftAssignmentService(db);
  }

  /**
   * POST /api/shift-assignments/employee
   * Phân ca cho một nhân viên
   */
  async assignToEmployee(req, res) {
    try {
      const { workShiftId, employeeId, assignDate, notes } = req.body;
      const userId = req.user?.id;

      // Validation
      if (!workShiftId || !employeeId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: workShiftId, employeeId'
        });
      }

      const data = {
        workShiftId,
        employeeId,
        assignDate,
        notes,
        createdBy: userId
      };

      const result = await this.service.assignShiftToEmployee(data);

      return res.status(201).json({
        success: true,
        message: 'Shift assigned to employee successfully',
        data: result
      });
    } catch (error) {
      console.error('[v0] Assign shift to employee error:', error);

      if (error.message.includes('already assigned')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * POST /api/shift-assignments/department
   * Phân ca cho toàn bộ phòng ban
   */
  async assignToDepartment(req, res) {
    try {
      const { workShiftId, departmentId, assignDate, notes } = req.body;
      const userId = req.user?.id;

      // Validation
      if (!workShiftId || !departmentId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: workShiftId, departmentId'
        });
      }

      const data = {
        workShiftId,
        departmentId,
        assignDate,
        notes,
        createdBy: userId
      };

      const result = await this.service.assignShiftToDepartment(data);

      return res.status(201).json({
        success: true,
        message: 'Shift assigned to department successfully',
        data: result
      });
    } catch (error) {
      console.error('[v0] Assign shift to department error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /api/shift-assignments/:id
   * Lấy chi tiết phân ca
   */
  async getById(req, res) {
    try {
      const { id } = req.params;

      const result = await this.service.getShiftAssignmentById(id);

      return res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      console.error('[v0] Get shift assignment error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /api/employees/:employeeId/shift-schedule
   * Lấy lịch làm của một nhân viên
   */
  async getEmployeeSchedule(req, res) {
    try {
      const { employeeId } = req.params;
      const { status, fromDate, toDate, limit, offset } = req.query;

      const filters = {
        status,
        fromDate,
        toDate,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined
      };

      const result = await this.service.getEmployeeAssignments(employeeId, filters);

      return res.status(200).json({
        success: true,
        data: result,
        count: result.length
      });
    } catch (error) {
      console.error('[v0] Get employee schedule error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /api/departments/:departmentId/shift-schedule
   * Lấy lịch làm của một phòng ban
   */
  async getDepartmentSchedule(req, res) {
    try {
      const { departmentId } = req.params;
      const { status, limit, offset } = req.query;

      const filters = {
        status,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined
      };

      const result = await this.service.getDepartmentAssignments(departmentId, filters);

      return res.status(200).json({
        success: true,
        data: result,
        count: result.length
      });
    } catch (error) {
      console.error('[v0] Get department schedule error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * PUT /api/shift-assignments/:id
   * Cập nhật phân ca
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      const userId = req.user?.id;

      const data = {
        status,
        notes,
        updatedBy: userId
      };

      const result = await this.service.updateShiftAssignment(id, data);

      return res.status(200).json({
        success: true,
        message: 'Shift assignment updated successfully',
        data: result
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      console.error('[v0] Update shift assignment error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * DELETE /api/shift-assignments/:id
   * Hủy phân ca
   */
  async cancel(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const result = await this.service.cancelShiftAssignment(id, userId);

      return res.status(200).json({
        success: true,
        message: 'Shift assignment cancelled successfully',
        data: result
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      console.error('[v0] Cancel shift assignment error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = ShiftAssignmentController;
