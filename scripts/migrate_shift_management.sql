-- ============================================================
-- Shift Management Database Schema
-- Tạo bảng cho quản lý ca làm việc
-- ============================================================

-- Create shift_groups table (Bảng nhóm ca)
CREATE TABLE IF NOT EXISTS shift_groups (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID',
  name VARCHAR(255) NOT NULL COMMENT 'Tên nhóm ca',
  description VARCHAR(500) COMMENT 'Mô tả nhóm ca',
  company_id CHAR(36) NOT NULL COMMENT 'ID công ty',
  is_active BOOLEAN DEFAULT TRUE COMMENT 'Trạng thái hoạt động',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời gian tạo',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Thời gian cập nhật',
  created_by CHAR(36) COMMENT 'Người tạo',
  updated_by CHAR(36) COMMENT 'Người cập nhật lần cuối',
  INDEX idx_company_id (company_id),
  INDEX idx_is_active (is_active),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Quản lý nhóm ca làm việc (Shift Groups)';

-- Create work_shifts table (Bảng ca làm việc)
CREATE TABLE IF NOT EXISTS work_shifts (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID',
  name VARCHAR(255) NOT NULL COMMENT 'Tên ca',
  description VARCHAR(500) COMMENT 'Mô tả ca',
  shift_group_id CHAR(36) NOT NULL COMMENT 'ID nhóm ca',
  start_time TIME NOT NULL COMMENT 'Giờ bắt đầu (HH:mm:ss)',
  end_time TIME NOT NULL COMMENT 'Giờ kết thúc (HH:mm:ss)',
  break_duration INT DEFAULT 0 COMMENT 'Thời gian nghỉ (phút)',
  work_duration INT NOT NULL COMMENT 'Thời gian làm việc (phút)',
  is_active BOOLEAN DEFAULT TRUE COMMENT 'Trạng thái hoạt động',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời gian tạo',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Thời gian cập nhật',
  created_by CHAR(36) COMMENT 'Người tạo',
  updated_by CHAR(36) COMMENT 'Người cập nhật lần cuối',
  FOREIGN KEY (shift_group_id) REFERENCES shift_groups(id),
  INDEX idx_shift_group_id (shift_group_id),
  INDEX idx_is_active (is_active),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Quản lý ca làm việc (Work Shifts)';

-- Create shift_assignments table (Bảng phân ca)
CREATE TABLE IF NOT EXISTS shift_assignments (
  id CHAR(36) PRIMARY KEY COMMENT 'UUID',
  work_shift_id CHAR(36) NOT NULL COMMENT 'ID ca làm việc',
  employee_id CHAR(36) COMMENT 'ID nhân viên (nếu phân ca cá nhân)',
  department_id CHAR(36) COMMENT 'ID phòng ban (nếu phân ca toàn bộ)',
  assignment_type ENUM('INDIVIDUAL', 'DEPARTMENT') NOT NULL COMMENT 'Loại phân ca',
  assign_date DATE NOT NULL COMMENT 'Ngày phân ca',
  unassign_date DATE COMMENT 'Ngày hủy phân ca',
  status ENUM('ACTIVE', 'CANCELLED', 'PENDING') DEFAULT 'ACTIVE' COMMENT 'Trạng thái phân ca',
  notes VARCHAR(500) COMMENT 'Ghi chú',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Thời gian tạo',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Thời gian cập nhật',
  created_by CHAR(36) COMMENT 'Người tạo',
  updated_by CHAR(36) COMMENT 'Người cập nhật lần cuối',
  FOREIGN KEY (work_shift_id) REFERENCES work_shifts(id),
  INDEX idx_work_shift_id (work_shift_id),
  INDEX idx_employee_id (employee_id),
  INDEX idx_department_id (department_id),
  INDEX idx_status (status),
  INDEX idx_assign_date (assign_date),
  INDEX idx_assignment_type (assignment_type),
  UNIQUE KEY unique_employee_shift (employee_id, work_shift_id, assign_date) -- Một nhân viên không thể được phân cùng một ca trong cùng ngày
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Quản lý phân ca làm việc (Shift Assignments)';

-- Create shift_schedule view (Để xem lịch làm việc)
CREATE OR REPLACE VIEW employee_shift_schedule AS
SELECT 
  sa.id as assignment_id,
  sa.employee_id,
  ws.id as shift_id,
  ws.name as shift_name,
  ws.start_time,
  ws.end_time,
  ws.break_duration,
  ws.work_duration,
  sa.assign_date,
  sa.status,
  sg.name as group_name
FROM shift_assignments sa
JOIN work_shifts ws ON sa.work_shift_id = ws.id
JOIN shift_groups sg ON ws.shift_group_id = sg.id
WHERE sa.assignment_type = 'INDIVIDUAL' AND sa.status = 'ACTIVE';

CREATE OR REPLACE VIEW department_shift_schedule AS
SELECT 
  sa.id as assignment_id,
  sa.department_id,
  ws.id as shift_id,
  ws.name as shift_name,
  ws.start_time,
  ws.end_time,
  ws.break_duration,
  ws.work_duration,
  sa.assign_date,
  sa.status,
  sg.name as group_name
FROM shift_assignments sa
JOIN work_shifts ws ON sa.work_shift_id = ws.id
JOIN shift_groups sg ON ws.shift_group_id = sg.id
WHERE sa.assignment_type = 'DEPARTMENT' AND sa.status = 'ACTIVE';
