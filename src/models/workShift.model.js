/**
 * Work Shift Model
 * Định nghĩa cấu trúc dữ liệu cho ca làm việc
 */

const WorkShiftSchema = {
  id: 'UUID',
  name: {
    type: String,
    required: true,
    maxlength: 255
  },
  description: {
    type: String,
    maxlength: 500
  },
  shiftGroupId: {
    type: 'UUID',
    required: true
  },
  startTime: {
    type: String, // HH:mm:ss format
    required: true
  },
  endTime: {
    type: String, // HH:mm:ss format
    required: true
  },
  breakDuration: {
    type: Number, // in minutes
    default: 0
  },
  workDuration: {
    type: Number, // in minutes
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
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

module.exports = WorkShiftSchema;
