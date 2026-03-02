/**
 * Shift Group Service
 * Xử lý business logic cho nhóm ca làm việc
 */

const { v4: uuidv4 } = require('uuid');

class ShiftGroupService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Tạo nhóm ca mới
   */
  async createShiftGroup(data) {
    try {
      const id = uuidv4();
      const now = new Date();

      const query = `
        INSERT INTO shift_groups 
        (id, name, description, company_id, is_active, created_at, updated_at, created_by, updated_by) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        id,
        data.name,
        data.description || null,
        data.companyId,
        data.isActive !== undefined ? data.isActive : true,
        now,
        now,
        data.createdBy,
        data.updatedBy || data.createdBy
      ];

      await this.db.query(query, values);

      return {
        id,
        ...data,
        createdAt: now,
        updatedAt: now
      };
    } catch (error) {
      throw new Error(`Failed to create shift group: ${error.message}`);
    }
  }

  /**
   * Lấy chi tiết nhóm ca
   */
  async getShiftGroupById(id) {
    try {
      const query = `
        SELECT * FROM shift_groups WHERE id = ?
      `;

      const [rows] = await this.db.query(query, [id]);

      if (rows.length === 0) {
        throw new Error('Shift group not found');
      }

      return rows[0];
    } catch (error) {
      throw new Error(`Failed to get shift group: ${error.message}`);
    }
  }

  /**
   * Lấy tất cả nhóm ca theo công ty
   */
  async getAllShiftGroups(companyId, filters = {}) {
    try {
      let query = 'SELECT * FROM shift_groups WHERE company_id = ?';
      const values = [companyId];

      if (filters.isActive !== undefined) {
        query += ' AND is_active = ?';
        values.push(filters.isActive);
      }

      query += ' ORDER BY created_at DESC';

      if (filters.limit) {
        query += ' LIMIT ? OFFSET ?';
        values.push(filters.limit, filters.offset || 0);
      }

      const [rows] = await this.db.query(query, values);
      return rows;
    } catch (error) {
      throw new Error(`Failed to get shift groups: ${error.message}`);
    }
  }

  /**
   * Cập nhật nhóm ca
   */
  async updateShiftGroup(id, data) {
    try {
      const now = new Date();
      const fields = [];
      const values = [];

      if (data.name !== undefined) {
        fields.push('name = ?');
        values.push(data.name);
      }

      if (data.description !== undefined) {
        fields.push('description = ?');
        values.push(data.description);
      }

      if (data.isActive !== undefined) {
        fields.push('is_active = ?');
        values.push(data.isActive);
      }

      fields.push('updated_at = ?');
      values.push(now);

      if (data.updatedBy) {
        fields.push('updated_by = ?');
        values.push(data.updatedBy);
      }

      values.push(id);

      const query = `UPDATE shift_groups SET ${fields.join(', ')} WHERE id = ?`;

      await this.db.query(query, values);

      return await this.getShiftGroupById(id);
    } catch (error) {
      throw new Error(`Failed to update shift group: ${error.message}`);
    }
  }

  /**
   * Xóa nhóm ca
   */
  async deleteShiftGroup(id) {
    try {
      // Check if shift group has work shifts
      const checkQuery = 'SELECT COUNT(*) as count FROM work_shifts WHERE shift_group_id = ?';
      const [checkResult] = await this.db.query(checkQuery, [id]);

      if (checkResult[0].count > 0) {
        throw new Error('Cannot delete shift group with existing work shifts');
      }

      const query = 'DELETE FROM shift_groups WHERE id = ?';
      await this.db.query(query, [id]);

      return { success: true, message: 'Shift group deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete shift group: ${error.message}`);
    }
  }

  /**
   * Lấy chi tiết nhóm ca với danh sách ca làm việc
   */
  async getShiftGroupDetails(id) {
    try {
      const group = await this.getShiftGroupById(id);

      const shiftsQuery = `
        SELECT * FROM work_shifts 
        WHERE shift_group_id = ? AND is_active = true
        ORDER BY created_at ASC
      `;

      const [shifts] = await this.db.query(shiftsQuery, [id]);

      return {
        ...group,
        shifts
      };
    } catch (error) {
      throw new Error(`Failed to get shift group details: ${error.message}`);
    }
  }
}

module.exports = ShiftGroupService;
