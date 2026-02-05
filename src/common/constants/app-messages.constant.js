export const AppMessages = {
  Success: {
    DEFAULT: 'Thành công',
    CREATED: 'Tạo mới thành công',
    UPDATED: 'Cập nhật thành công',
    DELETED: 'Xóa thành công',

    Auth: {
      LOGIN: 'Login successful',
      REGISTER: 'User registered successfully',
      TOKENS_REFRESHED: 'Tokens refreshed successfully',
      LOGOUT: 'Logged out successfully',
      PASSWORD_CHANGED: 'Password changed successfully',
      PROFILE_RETRIEVED: 'Profile retrieved successfully',
      PASSWORD_RESET_REQUESTED: 'Reset password email has been sent',
      PASSWORD_RESET_SUCCESS: 'Password has been reset successfully',
    },

    User: {
      CREATED: 'User created successfully',
      RETRIEVED_ALL: 'Users retrieved successfully',
      RETRIEVED: 'User retrieved successfully',
      UPDATED: 'User updated successfully',
      DELETED: 'User deleted successfully',
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

    Employee: {
      RETRIEVED_ALL: 'Lấy danh sách nhân viên thành công',
      RETRIEVED: 'Lấy thông tin nhân viên thành công',
      UPDATED: 'Cập nhật thông tin nhân viên thành công',
      DELETED: 'Xóa nhân viên thành công',
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
    },
    User: {
      NOT_FOUND: { code: 'USER_001', message: 'User not found' },
      ALREADY_EXISTS: { code: 'USER_002', message: 'User already exists' },
      INVALID_PASSWORD: { code: 'USER_003', message: 'Invalid password' },
      INACTIVE: { code: 'USER_004', message: 'User account is inactive' },
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
      NOT_FOUND: { code: 'CONTRACT_001', message: 'Hợp đồng không tìm thấy' },
      ALREADY_EXISTS: { code: 'CONTRACT_002', message: 'Hợp đồng đã tồn tại' },
      INVALID_DATE: {
        code: 'CONTRACT_003',
        message: 'Ngày kết thúc phải sau ngày bắt đầu',
      },
      ALREADY_TERMINATED: {
        code: 'CONTRACT_004',
        message: 'Hợp đồng đã được kết thúc',
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
    Validation: {
      FAILED: { code: 'VAL_001', message: 'Validation failed' },
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
