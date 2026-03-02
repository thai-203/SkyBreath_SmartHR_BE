/**
 * Shift Group Controller
 * Xử lý các request HTTP cho nhóm ca làm việc
 */

const ShiftGroupService = require('../services/shiftGroup.service');

class ShiftGroupController {
  constructor(db) {
    this.service = new ShiftGroupService(db);
  }

  /**
   * POST /api/shift-groups
   * Tạo nhóm ca mới
   */
  async create(req, res) {
    try {
      const { name, description, companyId } = req.body;
      const userId = req.user?.id; // From auth middleware

      // Validation
      if (!name || !companyId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required fields: name, companyId'
        });
      }

      const data = {
        name,
        description,
        companyId,
        createdBy: userId
      };

      const result = await this.service.createShiftGroup(data);

      return res.status(201).json({
        success: true,
        message: 'Shift group created successfully',
        data: result
      });
    } catch (error) {
      console.error('[v0] Shift group creation error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /api/shift-groups/:id
   * Lấy chi tiết nhóm ca
   */
  async getById(req, res) {
    try {
      const { id } = req.params;

      const result = await this.service.getShiftGroupById(id);

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

      console.error('[v0] Get shift group error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /api/shift-groups
   * Lấy danh sách nhóm ca
   */
  async getAll(req, res) {
    try {
      const { companyId } = req.query;
      const { isActive, limit, offset } = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameter: companyId'
        });
      }

      const filters = {
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        limit: limit ? parseInt(limit) : undefined,
        offset: offset ? parseInt(offset) : undefined
      };

      const result = await this.service.getAllShiftGroups(companyId, filters);

      return res.status(200).json({
        success: true,
        data: result,
        count: result.length
      });
    } catch (error) {
      console.error('[v0] Get shift groups error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * PUT /api/shift-groups/:id
   * Cập nhật nhóm ca
   */
  async update(req, res) {
    try {
      const { id } = req.params;
      const { name, description, isActive } = req.body;
      const userId = req.user?.id;

      const data = {
        name,
        description,
        isActive,
        updatedBy: userId
      };

      const result = await this.service.updateShiftGroup(id, data);

      return res.status(200).json({
        success: true,
        message: 'Shift group updated successfully',
        data: result
      });
    } catch (error) {
      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }

      console.error('[v0] Update shift group error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * DELETE /api/shift-groups/:id
   * Xóa nhóm ca
   */
  async delete(req, res) {
    try {
      const { id } = req.params;

      const result = await this.service.deleteShiftGroup(id);

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

      console.error('[v0] Delete shift group error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }

  /**
   * GET /api/shift-groups/:id/details
   * Lấy chi tiết nhóm ca với danh sách ca làm việc
   */
  async getDetails(req, res) {
    try {
      const { id } = req.params;

      const result = await this.service.getShiftGroupDetails(id);

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

      console.error('[v0] Get shift group details error:', error);
      return res.status(500).json({
        success: false,
        message: error.message
      });
    }
  }
}

module.exports = ShiftGroupController;
