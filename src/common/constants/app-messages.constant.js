export const AppMessages = {
  Success: {
    DEFAULT: 'Thành công',
    CREATED: 'Tạo mới thành công',
    UPDATED: 'Cập nhật thành công',
    DELETED: 'Xóa thành công',

    Auth: {
      LOGIN: 'Đăng nhập thành công',
      TOKENS_REFRESHED: 'Cập nhật token thành công',
      LOGOUT: 'Đăng xuất thành công',
      PASSWORD_CHANGED: 'Đổi mật khẩu thành công',
      PROFILE_RETRIEVED: 'Lấy thông tin hồ sơ thành công',
      PASSWORD_RESET_REQUESTED: 'Email khôi phục mật khẩu đã được gửi',
      PASSWORD_RESET_SUCCESS: 'Khôi phục mật khẩu thành công',
    },

    User: {
      CREATED: 'Tạo người dùng thành công',
      RETRIEVED_ALL: 'Danh sách người dùng đã được tải',
      RETRIEVED: 'Thông tin người dùng đã được tải',
      UPDATED: 'Cập nhật người dùng thành công',
      DELETED: 'Xóa người dùng thành công',
      LOCKED: 'Khóa tài khoản người dùng thành công',
      UNLOCKED: 'Mở khóa tài khoản người dùng thành công',
      SEARCHED: 'Tìm kiếm người dùng thành công',
    },

    Role: {
      CREATED: 'Role created successfully',
      RETRIEVED_ALL: 'Roles retrieved successfully',
      RETRIEVED: 'Role retrieved successfully',
      UPDATED: 'Role updated successfully',
      DELETED: 'Role deleted successfully',
    },

    Department: {
      CREATED: 'Tạo phòng ban thành công',
      UPDATED: 'Cập nhật phòng ban thành công',
      DELETED: 'Xóa phòng ban thành công',
    },

    Permission: {
      CREATED: 'Permission created successfully',
      RETRIEVED_ALL: 'Permissions retrieved successfully',
      RETRIEVED: 'Permission retrieved successfully',
      UPDATED: 'Permission updated successfully',
      DELETED: 'Permission deleted successfully',
    },

    Employee: {
      CREATED: 'Nhân viên đã được tạo thành công',
      RETRIEVED_ALL: 'Danh sách nhân viên đã được tải',
      RETRIEVED: 'Thông tin nhân viên đã được tải',
      UPDATED: 'Cập nhật nhân viên thành công',
      DELETED: 'Xóa nhân viên thành công',
    },

    ActionLog: {
      RETRIEVED_ALL: 'Action logs retrieved successfully',
      RETRIEVED: 'Action log retrieved successfully',
      CREATED: 'Action log recorded successfully',
    },

    ActionLog: {
      RETRIEVED_ALL: 'Action logs retrieved successfully',
      RETRIEVED: 'Action log retrieved successfully',
    },

    Contract: {
      CREATED: 'Hợp đồng đã được tạo thành công',
      RETRIEVED_ALL: 'Danh sách hợp đồng đã được tải',
      RETRIEVED: 'Thông tin hợp đồng đã được tải',
      UPDATED: 'Cập nhật hợp đồng thành công',
      TERMINATED: 'Hợp đồng đã được chấm dứt thành công',
      DELETED: 'Xóa hợp đồng thành công',
    },

    Timesheet: {
      GENERATED: 'Bảng chấm công đã được tạo thành công',
      RETRIEVED_ALL: 'Danh sách bảng chấm công đã được tải',
      RETRIEVED: 'Thông tin bảng chấm công đã được tải',
      UPDATED: 'Cập nhật bảng chấm công thành công',
      RECALCULATED: 'Đã tính lại bảng chấm công',
      LOCKED: 'Bảng chấm công đã được khóa',
      UNLOCKED: 'Bảng chấm công đã được mở khóa',
    },
  },

  Errors: {
    Auth: {
      INVALID_CREDENTIALS: { code: 'AUTH_001', message: 'Invalid credentials' },
      TOKEN_EXPIRED: { code: 'AUTH_002', message: 'Token expired' },
      TOKEN_INVALID: { code: 'AUTH_003', message: 'Invalid token' },
      UNAUTHORIZED: { code: 'AUTH_004', message: 'Unauthorized' },
      FORBIDDEN: { code: 'AUTH_005', message: 'Forbidden' },
      RESET_TOKEN_INVALID: {
        code: 'AUTH_006',
        message: 'Reset password token is invalid',
      },
      PASSWORD_NOT_DIFFERENT: {
        code: 'AUTH_007',
        message: 'Mật khẩu mới phải khác mật khẩu cũ',
      },
    },
    User: {
      NOT_FOUND: { code: 'USER_001', message: 'Không tìm thấy người dùng' },
      ALREADY_EXISTS: { code: 'USER_002', message: 'Người dùng đã tồn tại' },
      INVALID_PASSWORD: { code: 'USER_003', message: 'Mật khẩu hiện tại không đúng' },
      INACTIVE: { code: 'USER_004', message: 'Tài khoản người dùng không hoạt động' },
      LOCKED: { code: 'USER_005', message: 'Tài khoản người dùng bị khóa' },
      DELETED: { code: 'USER_006', message: 'Tài khoản người dùng đã bị xóa' },
      CANNOT_DELETE_SELF: { code: 'USER_007', message: 'Không thể xóa tài khoản của chính bạn' },
      CANNOT_DELETE_LAST_ADMIN: { code: 'USER_008', message: 'Không thể xóa tài khoản quản trị viên cuối cùng' },
      CANNOT_LOCK_SELF: { code: 'USER_009', message: 'Không thể khóa tài khoản của chính bạn' },
      CANNOT_LOCK_LAST_ADMIN: { code: 'USER_010', message: 'Không thể khóa tài khoản quản trị viên cuối cùng' },
      ALREADY_LOCKED: { code: 'USER_011', message: 'Tài khoản người dùng đã bị khóa' },
      ALREADY_ACTIVE: { code: 'USER_012', message: 'Tài khoản người dùng đã hoạt động' },
      CANNOT_UNLOCK_DELETED: { code: 'USER_013', message: 'Không thể mở khóa tài khoản đã bị xóa' },
      USERNAME_EXISTS: { code: 'USER_014', message: 'Tên người dùng đã tồn tại' },
      EMAIL_EXISTS: { code: 'USER_015', message: 'Email đã tồn tại' },
    },
    Employee: {
      NOT_FOUND: { code: 'EMP_001', message: 'Không tìm thấy nhân viên' },
      ALREADY_EXISTS: { code: 'EMP_002', message: 'Nhân viên đã tồn tại' },
      CODE_DUPLICATE: { code: 'EMP_003', message: 'Mã nhân viên bị trùng lặp' },
      EMAIL_DUPLICATE: { code: 'EMP_004', message: 'Email đã được sử dụng' },
      PHONE_DUPLICATE: {
        code: 'EMP_005',
        message: 'Số điện thoại đã được sử dụng',
      },
      NATIONAL_ID_DUPLICATE: {
        code: 'EMP_006',
        message: 'Số CMND/CCCD đã được sử dụng',
      },
      CODE_DUPLICATE: {
        code: 'EMP_007',
        message: 'Mã nhân viên đã tồn tại',
      },
    },
    Department: {
      NOT_FOUND: { code: 'DEPT_001', message: 'Không tìm thấy phòng ban' },
      ALREADY_EXISTS: { code: 'DEPT_002', message: 'Phòng ban đã tồn tại' },
      HAS_EMPLOYEES: {
        code: 'DEPT_003',
        message: 'Không thể xóa phòng ban đang có nhân viên',
      },
      HAS_CHILDREN: {
        code: 'DEPT_004',
        message: 'Không thể xóa phòng ban đang có phòng ban con',
      },
    },
    Contract: {
      NOT_FOUND: { code: 'CONTRACT_001', message: 'Contract not found' },
      ALREADY_EXISTS: { code: 'CONTRACT_002', message: 'The contract already exists' },
      INVALID_DATE: {
        code: 'CONTRACT_003',
        message: 'The end date must be after the start date',
      },
      ALREADY_TERMINATED: {
        code: 'CONTRACT_004',
        message: 'The contract has been terminated',
      },
    },
    Attendance: {
      ALREADY_CHECKED_IN: { code: 'ATT_001', message: 'Already checked in' },
      NOT_CHECKED_IN: { code: 'ATT_002', message: 'Not checked in' },
      NOT_FOUND: { code: 'ATT_003', message: 'Attendance record not found' },
    },
    Payroll: {
      NOT_FOUND: { code: 'PAY_001', message: 'Payroll not found' },
      ALREADY_PROCESSED: {
        code: 'PAY_002',
        message: 'Payroll already processed',
      },
      INVALID_PERIOD: { code: 'PAY_003', message: 'Invalid payroll period' },
    },
    ActionLog: {
      NOT_FOUND: { code: 'ACTLOG_001', message: 'Action log not found' },
    },
    Permission: {
      NOT_FOUND: { code: 'PERM_001', message: 'Permission not found' },
      ALREADY_EXISTS: { code: 'PERM_002', message: 'Permission code already exists' },
    },
    Timesheet: {
      NOT_FOUND: { code: 'TS_001', message: 'Không tìm thấy bảng chấm công' },
      ALREADY_EXISTS: { code: 'TS_002', message: 'Bảng chấm công đã tồn tại cho kỳ này' },
      IS_LOCKED: { code: 'TS_003', message: 'Bảng chấm công đã bị khóa, không thể chỉnh sửa' },
      ALREADY_LOCKED: { code: 'TS_004', message: 'Bảng chấm công đã được khóa rồi' },
      NOT_LOCKED: { code: 'TS_005', message: 'Bảng chấm công chưa bị khóa' },
    },
    Validation: {
      FAILED: { code: 'VAL_001', message: 'Validation failed' },
    },
    Onboarding: {
      PLAN_NOT_FOUND: { code: 'ONB_001', message: 'Kế hoạch onboarding không được tìm thấy' },
      PLAN_NAME_REQUIRED: { code: 'ONB_002', message: 'Tên kế hoạch onboarding là bắt buộc' },
      PROGRESS_NOT_FOUND: { code: 'ONB_003', message: 'Tiến trình onboarding không được tìm thấy' },
      PROGRESS_ALREADY_EXISTS: { code: 'ONB_004', message: 'Nhân viên đã có tiến trình onboarding cho kế hoạch này' },
      CANNOT_RESUME: { code: 'ONB_005', message: 'Chỉ có thể tiếp tục onboarding đã bị tạm dừng' },
      TEMPLATE_ALREADY_EXISTS: { code: 'ONB_006', message: 'Phòng ban và vị trí này đã có template onboarding. Vui lòng chỉnh sửa template hiện có.', },
    },
    General: {
      INTERNAL_SERVER_ERROR: { code: 'ERR_001', message: 'Lỗi máy chủ nội bộ' },
      BAD_REQUEST: { code: 'ERR_002', message: 'Yêu cầu không hợp lệ' },
      NOT_FOUND: { code: 'ERR_003', message: 'Không tìm thấy tài nguyên' },
      RESOURCE_ALREADY_EXISTS: {
        code: 'ERR_004',
        message: 'Tài nguyên đã tồn tại',
      },
    },
  },
};
