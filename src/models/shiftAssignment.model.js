/**
 * Shift Assignment Model
 * Định nghĩa cấu trúc dữ liệu cho phân ca
 */

const ShiftAssignmentSchema = {
  id: 'UUID',
  workShiftId: {
    type: 'UUID',
    required: true
  },
  employeeId: {
    type: 'UUID',
    required: false // Null if assigning to department
  },
  departmentId: {
    type: 'UUID',
    required: false // Null if assigning to employee
  },
  assignmentType: {
    type: String,
    enum: ['INDIVIDUAL', 'DEPARTMENT'],
    required: true
  },
  assignDate: {
    type: Date,
    required: true
  },
  unassignDate: {
    type: Date,
    required: false
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'CANCELLED', 'PENDING'],
    default: 'ACTIVE'
  },
  notes: {
    type: String,
    maxlength: 500
  },
  createdAt: {
    type: Date,
    default: () => new Date()
  },
  updatedAt: {
    type: Date,
    default: () => new Date()
  },
  createdBy: 'UUID',
  updatedBy: 'UUID'
};

module.exports = ShiftAssignmentSchema;
