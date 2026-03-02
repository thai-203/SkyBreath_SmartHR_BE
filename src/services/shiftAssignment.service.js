/**
 * Shift Assignment Service
 * Xử lý business logic cho phân ca
 */

const { v4: uuidv4 } = require('uuid');

class ShiftAssignmentService {
  constructor(db) {
    this.db = db;
  }

  /**
   * Phân ca cho một nhân viên
   */
  async assignShiftToEmployee(data) {
    try {
      const id = uuidv4();
      const now = new Date();

      // Validate work shift exists
      const shiftCheck = 'SELECT id FROM work_shifts WHERE id = ?';
      const [shiftResult] = await this.db.query(shiftCheck, [data.workShiftId]);

      if (shiftResult.length === 0) {
        throw new Error('Work shift not found');
      }

      // Validate employee exists
      const empCheck = 'SELECT id FROM employees WHERE id = ?';
      const [empResult] = await this.db.query(empCheck, [data.employeeId]);

      if (empResult.length === 0) {
        throw new Error('Employee not found');
      }

      // Check for existing active assignment
      const existingCheck = `
        SELECT id FROM shift_assignments 
        WHERE employee_id = ? AND work_shift_id = ? AND status = 'ACTIVE'
      `;
      const [existing] = await this.db.query(existingCheck, [data.employeeId, data.workShiftId]);

      if (existing.length > 0) {
        throw new Error('Employee already assigned to this shift');
      }

      const query = `
        INSERT INTO shift_assignments 
        (id, work_shift_id, employee_id, assignment_type, assign_date, status, notes, created_at, updated_at, created_by, updated_by) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        id,
        data.workShiftId,
        data.employeeId,
        'INDIVIDUAL',
        data.assignDate || now,
        data.status || 'ACTIVE',
        data.notes || null,
        now,
        now,
        data.createdBy,
        data.updatedBy || data.createdBy
      ];

      await this.db.query(query, values);

      return {
        id,
        ...data,
        assignmentType: 'INDIVIDUAL',
        createdAt: now,
        updatedAt: now
      };
    } catch (error) {
      throw new Error(`Failed to assign shift to employee: ${error.message}`);
    }
  }

  /**
   * Phân ca cho toàn bộ phòng ban
   */
  async assignShiftToDepartment(data) {
    try {
      // Validate work shift exists
      const shiftCheck = 'SELECT id FROM work_shifts WHERE id = ?';
      const [shiftResult] = await this.db.query(shiftCheck, [data.workShiftId]);

      if (shiftResult.length === 0) {
        throw new Error('Work shift not found');
      }

      // Validate department exists
      const deptCheck = 'SELECT id FROM departments WHERE id = ?';
      const [deptResult] = await this.db.query(deptCheck, [data.departmentId]);

      if (deptResult.length === 0) {
        throw new Error('Department not found');
      }

      const id = uuidv4();
      const now = new Date();

      const query = `
        INSERT INTO shift_assignments 
        (id, work_shift_id, department_id, assignment_type, assign_date, status, notes, created_at, updated_at, created_by, updated_by) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const values = [
        id,
        data.workShiftId,
        data.departmentId,
        'DEPARTMENT',
        data.assignDate || now,
        data.status || 'ACTIVE',
        data.notes || null,
        now,
        now,
        data.createdBy,
        data.updatedBy || data.createdBy
      ];

      await this.db.query(query, values);

      return {
        id,
        ...data,
        assignmentType: 'DEPARTMENT',
        createdAt: now,
        updatedAt: now
      };
    } catch (error) {
      throw new Error(`Failed to assign shift to department: ${error.message}`);
    }
  }

  /**
   * Lấy chi tiết phân ca
   */
  async getShiftAssignmentById(id) {
    try {
      const query = 'SELECT * FROM shift_assignments WHERE id = ?';
      const [rows] = await this.db.query(query, [id]);

      if (rows.length === 0) {
        throw new Error('Shift assignment not found');
      }

      return rows[0];
    } catch (error) {
      throw new Error(`Failed to get shift assignment: ${error.message}`);
    }
  }

  /**
   * Lấy tất cả phân ca của một nhân viên
   */
  async getEmployeeAssignments(employeeId, filters = {}) {
    try {
      let query = `
        SELECT sa.*, ws.name as shift_name, ws.start_time, ws.end_time 
        FROM shift_assignments sa
        JOIN work_shifts ws ON sa.work_shift_id = ws.id
        WHERE sa.employee_id = ? AND sa.assignment_type = 'INDIVIDUAL'
      `;
      const values = [employeeId];

      if (filters.status) {
        query += ' AND sa.status = ?';
        values.push(filters.status);
      }

      if (filters.fromDate) {
        query += ' AND sa.assign_date >= ?';
        values.push(filters.fromDate);
      }

      if (filters.toDate) {
        query += ' AND sa.assign_date <= ?';
        values.push(filters.toDate);
      }

      query += ' ORDER BY sa.assign_date DESC';

      if (filters.limit) {
        query += ' LIMIT ? OFFSET ?';
        values.push(filters.limit, filters.offset || 0);
      }

      const [rows] = await this.db.query(query, values);
      return rows;
    } catch (error) {
      throw new Error(`Failed to get employee assignments: ${error.message}`);
    }
  }

  /**
   * Lấy tất cả phân ca của một phòng ban
   */
  async getDepartmentAssignments(departmentId, filters = {}) {
    try {
      let query = `
        SELECT sa.*, ws.name as shift_name, ws.start_time, ws.end_time 
        FROM shift_assignments sa
        JOIN work_shifts ws ON sa.work_shift_id = ws.id
        WHERE sa.department_id = ? AND sa.assignment_type = 'DEPARTMENT'
      `;
      const values = [departmentId];

      if (filters.status) {
        query += ' AND sa.status = ?';
        values.push(filters.status);
      }

      query += ' ORDER BY sa.assign_date DESC';

      if (filters.limit) {
        query += ' LIMIT ? OFFSET ?';
        values.push(filters.limit, filters.offset || 0);
      }

      const [rows] = await this.db.query(query, values);
      return rows;
    } catch (error) {
      throw new Error(`Failed to get department assignments: ${error.message}`);
    }
  }

  /**
   * Cập nhật phân ca
   */
  async updateShiftAssignment(id, data) {
    try {
      const now = new Date();
      const fields = [];
      const values = [];

      if (data.status !== undefined) {
        fields.push('status = ?');
        values.push(data.status);
      }

      if (data.notes !== undefined) {
        fields.push('notes = ?');
        values.push(data.notes);
      }

      if (data.unassignDate !== undefined) {
        fields.push('unassign_date = ?');
        values.push(data.unassignDate);
      }

      fields.push('updated_at = ?');
      values.push(now);

      if (data.updatedBy) {
        fields.push('updated_by = ?');
        values.push(data.updatedBy);
      }

      values.push(id);

      const query = `UPDATE shift_assignments SET ${fields.join(', ')} WHERE id = ?`;

      await this.db.query(query, values);

      return await this.getShiftAssignmentById(id);
    } catch (error) {
      throw new Error(`Failed to update shift assignment: ${error.message}`);
    }
  }

  /**
   * Hủy phân ca
   */
  async cancelShiftAssignment(id, cancelledBy) {
    try {
      return await this.updateShiftAssignment(id, {
        status: 'CANCELLED',
        unassignDate: new Date(),
        updatedBy: cancelledBy
      });
    } catch (error) {
      throw new Error(`Failed to cancel shift assignment: ${error.message}`);
    }
  }
}

module.exports = ShiftAssignmentService;
