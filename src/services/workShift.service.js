/**
 * Work Shift Service
 * Xử lý business logic cho ca làm việc
 */

const { v4: uuidv4 } = require('uuid');

class WorkShiftService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Tạo ca làm việc mới
   */
  async createWorkShift(data) {
    try {
      const id = uuidv4();
      const now = new Date();

      // Validate shift group exists
      const groupCheck = 'SELECT id FROM shift_groups WHERE id = ?';
      const [groupResult] = await this.db.query(groupCheck, [data.shiftGroupId]);

      if (groupResult.length === 0) {
        throw new Error('Shift group not found');
      }

      // Calculate work duration if not provided
      let workDuration = data.workDuration;
      if (!workDuration) {
        workDuration = this.calculateWorkDuration(data.startTime, data.endTime, data.breakDuration);
      }

      const query = `
        INSERT INTO work_shifts 
        (id, name, description, shift_group_id, start_time, end_time, break_duration, work_duration, is_active, created_at, updated_at, created_by, updated_by) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        id,
        data.name,
        data.description || null,
        data.shiftGroupId,
        data.startTime,
        data.endTime,
        data.breakDuration || 0,
        workDuration,
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
        workDuration,
        createdAt: now,
        updatedAt: now
      };
    } catch (error) {
      throw new Error(`Failed to create work shift: ${error.message}`);
    }
  }

  /**
   * Lấy chi tiết ca làm việc
   */
  async getWorkShiftById(id) {
    try {
      const query = 'SELECT * FROM work_shifts WHERE id = ?';
      const [rows] = await this.db.query(query, [id]);

      if (rows.length === 0) {
        throw new Error('Work shift not found');
      }

      return rows[0];
    } catch (error) {
      throw new Error(`Failed to get work shift: ${error.message}`);
    }
  }

  /**
   * Lấy tất cả ca làm việc theo nhóm ca
   */
  async getWorkShiftsByGroup(shiftGroupId, filters = {}) {
    try {
      let query = 'SELECT * FROM work_shifts WHERE shift_group_id = ?';
      const values = [shiftGroupId];

      if (filters.isActive !== undefined) {
        query += ' AND is_active = ?';
        values.push(filters.isActive);
      }

      query += ' ORDER BY start_time ASC';

      if (filters.limit) {
        query += ' LIMIT ? OFFSET ?';
        values.push(filters.limit, filters.offset || 0);
      }

      const [rows] = await this.db.query(query, values);
      return rows;
    } catch (error) {
      throw new Error(`Failed to get work shifts: ${error.message}`);
    }
  }

  /**
   * Cập nhật ca làm việc
   */
  async updateWorkShift(id, data) {
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

      if (data.startTime !== undefined) {
        fields.push('start_time = ?');
        values.push(data.startTime);
      }

      if (data.endTime !== undefined) {
        fields.push('end_time = ?');
        values.push(data.endTime);
      }

      if (data.breakDuration !== undefined) {
        fields.push('break_duration = ?');
        values.push(data.breakDuration);
      }

      // Recalculate work duration if times changed
      if (data.startTime || data.endTime) {
        const shift = await this.getWorkShiftById(id);
        const newWorkDuration = this.calculateWorkDuration(
          data.startTime || shift.startTime,
          data.endTime || shift.endTime,
          data.breakDuration !== undefined ? data.breakDuration : shift.breakDuration
        );
        fields.push('work_duration = ?');
        values.push(newWorkDuration);
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

      const query = `UPDATE work_shifts SET ${fields.join(', ')} WHERE id = ?`;

      await this.db.query(query, values);

      return await this.getWorkShiftById(id);
    } catch (error) {
      throw new Error(`Failed to update work shift: ${error.message}`);
    }
  }

  /**
   * Xóa ca làm việc
   */
  async deleteWorkShift(id) {
    try {
      // Check if work shift has assignments
      const checkQuery = 'SELECT COUNT(*) as count FROM shift_assignments WHERE work_shift_id = ?';
      const [checkResult] = await this.db.query(checkQuery, [id]);

      if (checkResult[0].count > 0) {
        throw new Error('Cannot delete work shift with existing assignments');
      }

      const query = 'DELETE FROM work_shifts WHERE id = ?';
      await this.db.query(query, [id]);

      return { success: true, message: 'Work shift deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete work shift: ${error.message}`);
    }
  }

  /**
   * Tính toán thời gian làm việc (phút)
   */
  calculateWorkDuration(startTime, endTime, breakDuration = 0) {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    let start = startHour * 60 + startMin;
    let end = endHour * 60 + endMin;

    // If end time is less than start time, assume next day
    if (end < start) {
      end += 24 * 60;
    }

    return end - start - (breakDuration || 0);
  }
}

module.exports = WorkShiftService;
