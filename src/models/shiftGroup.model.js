/**
 * Shift Group Model
 * Định nghĩa cấu trúc dữ liệu cho nhóm ca làm việc
 */

const ShiftGroupSchema = {
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
  companyId: {
    type: 'UUID',
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

module.exports = ShiftGroupSchema;
