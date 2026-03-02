/**
 * Work Shift Controller
 * Xử lý các request HTTP cho ca làm việc
 */

const WorkShiftService = require('../services/workShift.service');

class WorkShiftController {
  constructor(db) {
    this.service = new WorkShiftService(db);
  }

  /**
   * POST /api/work-shifts
   * Tạo ca làm việc mới
   */
  async create(req, res) {
    try {
      const { name, description, shiftGroupId, startTime, endTime, breakDuration, workDuration } = req.body;
      const userId = req.user?.id;

      // Validation
      if (!name || !shiftGroupId || !startTime || !endTime) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: name, shiftGroupId, startTime, endTime'
        });
      }

      // Validate time format (HH:mm:ss)
      const timeRegex = /^([0-1]\d|2[0-3]):[0-5]\d:[0-5]\d$/;
      if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid time format. Expected HH:mm:ss'
        });
      }

      const data = {
        name,
        description,
        shiftGroupId,
        startTime,
        endTime,
        breakDuration,
        workDuration,
        createdBy: userId
      };

      const result = await this.service.createWorkShift(data);

      return res.status(201).json({
        success: true,
        message: 'Work shift created successfully',
        data: result
      });
    } catch (error) {
      console.error('[v0] Work shift creation error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /api/work-shifts/:id
   * Lấy chi tiết ca làm việc
   */
  async getById(req, res) {
    try {
      const { id } = req.params;

      const result = await this.service.getWorkShiftById(id);

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

      console.error('[v0] Get work shift error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /api/shift-groups/:shiftGroupId/work-shifts
   * Lấy danh sách ca làm việc theo nhóm ca
   */
  async getByGroup(req, res) {
    try {
      const { shiftGroupId } = req.params;
      const { isActive, limit, offset } = req.query;

      const filters = {
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined
      };

      const result = await this.service.getWorkShiftsByGroup(shiftGroupId, filters);

      return res.status(200).json({
        success: true,
        data: result,
        count: result.length
      });
    } catch (error) {
      console.error('[v0] Get work shifts error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * PUT /api/work-shifts/:id
   * Cập nhật ca làm việc
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const { name, description, startTime, endTime, breakDuration, isActive } = req.body;
      const userId = req.user?.id;

      // Validate time format if provided
      if (startTime || endTime) {
        const timeRegex = /^([0-1]\d|2[0-3]):[0-5]\d:[0-5]\d$/;
        if ((startTime && !timeRegex.test(startTime)) || (endTime && !timeRegex.test(endTime))) {
          return res.status(400).json({
            success: false,
            message: 'Invalid time format. Expected HH:mm:ss'
          });
        }
      }

      const data = {
        name,
        description,
        startTime,
        endTime,
        breakDuration,
        isActive,
        updatedBy: userId
      };

      const result = await this.service.updateWorkShift(id, data);

      return res.status(200).json({
        success: true,
        message: 'Work shift updated successfully',
        data: result
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      console.error('[v0] Update work shift error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * DELETE /api/work-shifts/:id
   * Xóa ca làm việc
   */
  async delete(req, res) {
    try {
      const { id } = req.params;

      const result = await this.service.deleteWorkShift(id);

      return res.status(200).json({
        success: true,
        message: result.message,
        data: result
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('Cannot delete')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }

      console.error('[v0] Delete work shift error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = WorkShiftController;
