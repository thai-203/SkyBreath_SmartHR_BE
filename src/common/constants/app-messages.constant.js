export const AppMessages = {
  Success: {
    DEFAULT: 'Thành công',
    CREATED: 'Tạo mới thành công',
    UPDATED: 'Cập nhật thành công',
    DELETED: 'Xóa thành công',

    Auth: {
      LOGIN: 'Đăng nhập thành công',
      TOKENS_REFRESHED: 'Cập nhật phiên làm việc thành công',
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
      CREATED: 'Tạo vai trò thành công',
      RETRIEVED_ALL: 'Lấy danh sách vai trò thành công',
      RETRIEVED: 'Lấy thông tin vai trò thành công',
      UPDATED: 'Cập nhật vai trò thành công',
      DELETED: 'Xóa vai trò thành công',
    },

    Department: {
      CREATED: 'Tạo phòng ban thành công',
      UPDATED: 'Cập nhật phòng ban thành công',
      DELETED: 'Xóa phòng ban thành công',
    },

    Permission: {
      CREATED: 'Tạo quyền thành công',
      RETRIEVED_ALL: 'Lấy danh sách quyền thành công',
      RETRIEVED: 'Lấy thông tin quyền thành công',
      UPDATED: 'Cập nhật quyền thành công',
      DELETED: 'Xóa quyền thành công',
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
      ADDED_EMPLOYEE: 'Đã thêm nhân viên vào bảng chấm công',
      REMOVED_EMPLOYEE: 'Đã xóa nhân viên khỏi bảng chấm công',
      BULK_LOCKED: 'Đã khóa tất cả bảng chấm công',
    },
    ShiftGroup: {
      CREATED: 'Nhóm ca đã được tạo thành công',
      RETRIEVED_ALL: 'Danh sách nhóm ca đã được tải',
      RETRIEVED: 'Thông tin nhóm ca đã được tải',
      UPDATED: 'Cập nhật nhóm ca thành công',
      DELETED: 'Xóa nhóm ca thành công',
    },
    WorkingShift: {
      CREATED: 'Ca làm việc đã được tạo thành công',
      RETRIEVED_ALL: 'Danh sách ca làm việc đã được tải',
      RETRIEVED: 'Thông tin ca làm việc đã được tải',
      UPDATED: 'Cập nhật ca làm việc thành công',
      DELETED: 'Xóa ca làm việc thành công',
    },
    ShiftAssignment: {
      CREATED: 'Phân ca thành công',
      RETRIEVED_ALL: 'Danh sách phân ca đã được tải',
      RETRIEVED: 'Thông tin phân ca đã được tải',
      UPDATED: 'Cập nhật phân ca thành công',
      DELETED: 'Hủy phân ca thành công',
    },
    Payroll: {
      CREATED: 'Bảng lương đã được tạo thành công',
      CALCULATED: 'Đã tính toán lương tự động thành công',
      UPDATED: 'Cập nhật bảng lương thành công',
      RETRIEVED_ALL: 'Danh sách bảng lương đã được tải',
      RETRIEVED: 'Thông tin bảng lương đã được tải',
      SUBMITTED: 'Bảng lương đã được gửi phê duyệt',
      APPROVED: 'Bảng lương đã được phê duyệt',
      REJECTED: 'Bảng lương đã bị từ chối',
      LOCKED: 'Bảng lương đã được khóa thành công',
      PAYSLIPS_SENT: 'Phiếu lương đã được gửi đến nhân viên',
      EXPORTED: 'Xuất file thành công',
    },
    BlockingRule: {
      CREATED: 'Tạo quy tắc thành công',
      UPDATED: 'Cập nhật quy tắc thành công',
      RETRIEVED_ALL: 'Lấy danh sách quy tắc thành công',
      DELETED: 'Xóa quy tắc thành công',
    },
    Attendance: {
      CHECKED_IN: 'Điểm danh vào thành công',
      CHECKED_OUT: 'Điểm danh ra thành công',
      TODAY_CONTEXT_RETRIEVED: 'Lấy thông tin chuyên cần hôm nay thành công',
      SECURITY_CONFIG_RETRIEVED: 'Lấy cấu hình bảo mật thành công',
      BLOCKING_RULES_RETRIEVED: 'Lấy danh sách quy tắc khóa thành công',
      BLOCKING_RULE_CREATED: 'Tạo quy tắc khóa thành công',
      BLOCKING_RULE_UPDATED: 'Cập nhật quy tắc khóa thành công',
      BLOCKING_RULE_STATUS_UPDATED:
        'Cập nhật trạng thái quy tắc khóa thành công',
      BLOCKING_RULE_DELETED: 'Xóa quy tắc khóa thành công',
      ALLOWED_IPS_RETRIEVED: 'Lấy danh sách IP được phép thành công',
      ALLOWED_IP_CREATED: 'Thêm IP được phép thành công',
      ALLOWED_IP_DELETED: 'Xóa IP được phép thành công',
    },
    AttendanceAllowedIp: {
      RETRIEVED_ALL: 'Lấy danh sách IP được phép thành công',
      CREATED: 'Thêm IP được phép thành công',
      DELETED: 'Xóa IP được phép thành công',
    },
    AttendanceSecurityConfig: {
      RETRIEVED: 'Lấy cấu hình bảo mật thành công',
      UPDATED: 'Cập nhật cấu hình bảo mật thành công',
      RESET: 'Đặt lại cấu hình bảo mật về mặc định thành công',
    },
    FaceRecognitionConfig: {
      RETRIEVED: 'Lấy cấu hình nhận diện khuôn mặt thành công',
      UPDATED: 'Cập nhật cấu hình nhận diện khuôn mặt thành công',
      RESET: 'Đặt lại cấu hình nhận diện khuôn mặt về mặc định thành công',
    },
  },

  Errors: {
    Auth: {
      PASSWORD_CHANGE_REQUIRED: {
        code: 'AUTH_000',
        message: 'Bạn cần đổi mật khẩu trước khi tiếp tục',
      },
      INVALID_CREDENTIALS: {
        code: 'AUTH_001',
        message: 'Email hoặc mật khẩu không chính xác',
      },
      TOKEN_EXPIRED: {
        code: 'AUTH_002',
        message: 'Phiên đăng nhập đã hết hạn',
      },
      TOKEN_INVALID: {
        code: 'AUTH_003',
        message: 'Phiên đăng nhập không hợp lệ',
      },
      UNAUTHORIZED: {
        code: 'AUTH_004',
        message: 'Không có quyền thực hiện hành động này',
      },
      FORBIDDEN: {
        code: 'AUTH_005',
        message: 'Bạn không có quyền truy cập tính năng này',
      },
      RESET_OTP_INVALID: {
        code: 'AUTH_006',
        message: 'OTP không hợp lệ hoặc đã hết hạn',
      },
      PASSWORD_NOT_DIFFERENT: {
        code: 'AUTH_007',
        message: 'Mật khẩu mới không được trùng với mật khẩu cũ',
      },
      INVALID_EMAIL: {
        code: 'AUTH_008',
        message: 'Email không hợp lệ',
      },
      INVALID_PASSWORD: {
        code: 'AUTH_009',
        message:
          'Mật khẩu phải chứa ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt',
      },
      EMAIL_REQUIRED: {
        code: 'AUTH_010',
        message: 'Email không được để trống',
      },
      PASSWORD_REQUIRED: {
        code: 'AUTH_011',
        message: 'Mật khẩu không được để trống',
      },
      ACCOUNT_LOCKED: {
        code: 'AUTH_012',
        message: 'Tài khoản của bạn đã bị khóa',
      },
      ACCOUNT_INACTIVE: {
        code: 'AUTH_013',
        message: 'Tài khoản chưa được kích hoạt',
      },
      ACCOUNT_NOT_FOUND: {
        code: 'AUTH_014',
        message: 'Không tìm thấy tài khoản',
      },
      PROFILE_NOT_FOUND: {
        code: 'AUTH_015',
        message: 'Không tìm thấy hồ sơ',
      },
      PASSWORD_CURRENT_MISMATCH: {
        code: 'AUTH_016',
        message: 'Mật khẩu hiện tại không chính xác',
      },
      PASSWORD_CURRENT_REQUIRED: {
        code: 'AUTH_017',
        message: 'Mật khẩu hiện tại không được để trống',
      },
      PASSWORD_NEW_REQUIRED: {
        code: 'AUTH_018',
        message: 'Mật khẩu mới không được để trống',
      },
      PASSWORD_CURRENT_INVALID: {
        code: 'AUTH_019',
        message: 'Mật khẩu hiện tại không hợp lệ',
      },
      PASSWORD_NEW_INVALID: {
        code: 'AUTH_020',
        message: 'Mật khẩu mới không hợp lệ',
      },
    },
    User: {
      NOT_FOUND: { code: 'USER_001', message: 'Không tìm thấy người dùng' },
      EMAIL_ALREADY_EXISTS: {
        code: 'USER_002',
        message: 'Email đã tồn tại',
      },
      USERNAME_ALREADY_EXISTS: {
        code: 'USER_003',
        message: 'Tên đăng nhập đã tồn tại',
      },
      INVALID_PASSWORD: {
        code: 'USER_004',
        message: 'Mật khẩu hiện tại không đúng',
      },
      INACTIVE: {
        code: 'USER_005',
        message: 'Tài khoản người dùng không hoạt động',
      },
      LOCKED: { code: 'USER_005', message: 'Tài khoản người dùng bị khóa' },
      DELETED: { code: 'USER_006', message: 'Tài khoản người dùng đã bị xóa' },
      CANNOT_DELETE_SELF: {
        code: 'USER_007',
        message: 'Không thể xóa tài khoản của chính bạn',
      },
      CANNOT_DELETE_LAST_ADMIN: {
        code: 'USER_008',
        message: 'Không thể xóa tài khoản quản trị viên cuối cùng',
      },
      CANNOT_LOCK_SELF: {
        code: 'USER_009',
        message: 'Không thể khóa tài khoản của chính bạn',
      },
      CANNOT_LOCK_LAST_ADMIN: {
        code: 'USER_010',
        message: 'Không thể khóa tài khoản quản trị viên cuối cùng',
      },
      ALREADY_LOCKED: {
        code: 'USER_011',
        message: 'Tài khoản người dùng đã bị khóa',
      },
      ALREADY_ACTIVE: {
        code: 'USER_012',
        message: 'Tài khoản người dùng đã hoạt động',
      },
      CANNOT_UNLOCK_DELETED: {
        code: 'USER_013',
        message: 'Không thể mở khóa tài khoản đã bị xóa',
      },
      USERNAME_EXISTS: {
        code: 'USER_014',
        message: 'Tên người dùng đã tồn tại',
      },
      EMAIL_EXISTS: { code: 'USER_015', message: 'Email đã tồn tại' },
      ROLE_ASIGN_FORBIDDEN: {
        code: 'USER_016',
        message: 'Không thể gán vai trò admin',
      },
      ROLE_NOT_FOUND: { code: 'USER_017', message: 'Không tìm thấy vai trò' },
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
      CIRCULAR_DEPENDENCY: {
        code: 'DEPT_005',
        message:
          'Lỗi vòng lặp: Không thể chọn phòng ban cấp dưới làm phòng ban cha',
      },
      SAME_AS_PARENT: {
        code: 'DEPT_006',
        message: 'Không thể chọn chính phòng ban này làm phòng ban cha',
      },
    },
    Contract: {
      NOT_FOUND: { code: 'CONTRACT_001', message: 'Không tìm thấy hợp đồng' },
      ALREADY_EXISTS: { code: 'CONTRACT_002', message: 'Hợp đồng đã tồn tại' },
      INVALID_DATE: {
        code: 'CONTRACT_003',
        message: 'The end date must be after the start date',
      },
      ALREADY_TERMINATED: {
        code: 'CONTRACT_004',
        message: 'Hợp đồng đã được chấm dứt',
      },
    },
    Attendance: {
      // ── Check-in / Check-out flow ────────────────────────────────────────
      ALREADY_CHECKED_IN: {
        code: 'ATT_001',
        message: 'Nhân viên đã check-in hôm nay',
      },
      ALREADY_CHECKED_OUT: {
        code: 'ATT_002',
        message: 'Đã check-out rồi',
      },
      NOT_CHECKED_IN: {
        code: 'ATT_003',
        message: 'Chưa check-in hôm nay',
      },
      NOT_FOUND: {
        code: 'ATT_004',
        message: 'Không tìm thấy bản ghi chuyên cần',
      },
      NO_IMAGE_PROVIDED: {
        code: 'ATT_005',
        message: 'Không có ảnh được gửi lên',
      },
      NO_SHIFT_TODAY: {
        code: 'ATT_006',
        message: 'Không có ca làm việc hôm nay',
      },

      // ── Network / Location ───────────────────────────────────────────────
      IP_NOT_ALLOWED: {
        code: 'ATT_007',
        message: 'IP không được phép chấm công',
        errorType: 'NETWORK', // ← dùng để map blocking config
      },
      LOCATION_OUT_OF_RANGE: {
        code: 'ATT_008',
        message: 'Vị trí ngoài phạm vi cho phép',
        errorType: 'LOCATION',
      },
      VPN_DETECTED: {
        code: 'ATT_021',
        message: 'Phát hiện kết nối VPN/Proxy. Vui lòng tắt VPN và thử lại.',
        errorType: 'NETWORK',
      },

      // ── Face recognition ────────────────────────────────────────────────
      NO_FACE_DATA_REGISTERED: {
        code: 'ATT_009',
        message: 'Chưa đăng ký khuôn mặt',
      },
      FACE_RECOGNITION_FAILED: {
        code: 'ATT_010',
        message: 'Nhận diện thất bại',
        errorType: 'FACE',
      },
      INSUFFICIENT_FRAMES: {
        code: 'ATT_011',
        message: 'Cần ít nhất {requiredFrames} frames, nhận được {fileCount}',
        errorType: 'FACE',
      },
      LIVENESS_SCORE_LOW: {
        code: 'ATT_012',
        message: 'Liveness thấp ({score}), ngưỡng: {threshold}',
        errorType: 'FACE',
      },
      SPOOF_DETECTED: {
        code: 'ATT_013',
        message: 'Phát hiện gian lận chấm công',
        errorType: 'FACE',
      },
      NO_FACE_DETECTED: {
        code: 'ATT_014',
        message: 'Không phát hiện khuôn mặt',
        errorType: 'FACE',
      },
      FACE_TOO_SMALL: {
        code: 'ATT_015',
        message: 'Khuôn mặt quá nhỏ (min {minSize}px)',
        errorType: 'FACE',
      },
      FACE_NOT_MATCHED: {
        code: 'ATT_016',
        message: 'Khuôn mặt không khớp với dữ liệu đã đăng ký',
        errorType: 'FACE',
      },

      // ── Blocking config CRUD ────────────────────────────────────────────
      BLOCKING_RULE_ALREADY_EXISTS: {
        code: 'ATT_018',
        message: 'Quy tắc cho loại vi phạm này đã tồn tại',
      },
      BLOCKING_RULE_NOT_FOUND: {
        code: 'ATT_019',
        message: 'Không tìm thấy cấu hình quy tắc',
      },

      // ── Allowed IP CRUD ─────────────────────────────────────────────────
      ALLOWED_IP_ALREADY_EXISTS: {
        code: 'ATT_020',
        message: 'IP đã tồn tại trong danh sách',
      },
      ALLOWED_IP_NOT_FOUND: {
        code: 'ATT_022',
        message: 'Không tìm thấy IP trong danh sách',
      },
    },
    Payroll: {
      NOT_FOUND: { code: 'PAY_001', message: 'Không tìm thấy bảng lương' },
      ALREADY_EXISTS: {
        code: 'PAY_002',
        message: 'Bảng lương cho tháng/năm này đã tồn tại',
      },
      INVALID_PERIOD: { code: 'PAY_003', message: 'Kỳ lương không hợp lệ' },
      IS_LOCKED: {
        code: 'PAY_004',
        message: 'Bảng lương đã bị khóa, không thể chỉnh sửa',
      },
      NOT_LOCKED: { code: 'PAY_005', message: 'Bảng lương chưa được khóa' },
      INVALID_STATUS_TRANSITION: {
        code: 'PAY_006',
        message: 'Trạng thái bảng lương không hợp lệ cho thao tác này',
      },
      DETAIL_NOT_FOUND: {
        code: 'PAY_007',
        message: 'Không tìm thấy chi tiết lương',
      },
    },
    ActionLog: {
      NOT_FOUND: {
        code: 'ACTLOG_001',
        message: 'Không tìm thấy nhật ký hoạt động',
      },
    },
    Role: {
      NOT_FOUND: { code: 'ROLE_001', message: 'Không tìm thấy vai trò' },
      ALREADY_EXISTS: { code: 'ROLE_002', message: 'Tên vai trò đã tồn tại' },
      IN_USE: {
        code: 'ROLE_003',
        message: 'Vai trò đang được gắn với người dùng, không thể xóa',
      },
      SYSTEM_ROLE: {
        code: 'ROLE_004',
        message: 'Không thể chỉnh sửa hoặc xóa vai trò hệ thống',
      },
    },
    Permission: {
      NOT_FOUND: { code: 'PERM_001', message: 'Không tìm thấy quyền' },
      ALREADY_EXISTS: { code: 'PERM_002', message: 'Mã quyền đã tồn tại' },
    },
    Timesheet: {
      NOT_FOUND: { code: 'TS_001', message: 'Không tìm thấy bảng chấm công' },
      ALREADY_EXISTS: {
        code: 'TS_002',
        message: 'Bảng chấm công đã tồn tại cho kỳ này',
      },
      IS_LOCKED: {
        code: 'TS_003',
        message: 'Bảng chấm công đã bị khóa, không thể chỉnh sửa',
      },
      ALREADY_LOCKED: {
        code: 'TS_004',
        message: 'Bảng chấm công đã được khóa rồi',
      },
      NOT_LOCKED: { code: 'TS_005', message: 'Bảng chấm công chưa bị khóa' },
      EMPLOYEE_NOT_FOUND: {
        code: 'TS_006',
        message: 'Không tìm thấy nhân viên',
      },
    },
    ShiftGroup: {
      NOT_FOUND: { code: 'SG_001', message: 'Không tìm thấy nhóm ca' },
      ALREADY_EXISTS: { code: 'SG_002', message: 'Nhóm ca đã tồn tại' },
      HAS_SHIFTS: {
        code: 'SG_003',
        message:
          'Nhóm ca đang có ca làm việc, không thể thực hiện thao tác này',
      },
      INACTIVE: {
        code: 'SG_004',
        message: 'Nhóm ca hiện không hoạt động',
      },
    },
    WorkingShift: {
      NOT_FOUND: { code: 'SH_001', message: 'Không tìm thấy ca làm việc' },
      ALREADY_EXISTS: { code: 'SH_002', message: 'Ca làm việc đã tồn tại' },
      ASSIGNED: {
        code: 'SH_003',
        message: 'Ca làm việc đã được gán cho nhân viên, không thể xóa',
      },
      ASSIGNED_TIME_LOCKED: {
        code: 'SH_004',
        message:
          'Ca làm việc đã được gán cho nhân viên, không thể chỉnh sửa khung giờ',
      },
    },
    ShiftAssignment: {
      NOT_FOUND: { code: 'SA_001', message: 'Không tìm thấy phân ca' },
      OVERLAP: {
        code: 'SA_002',
        message: 'Phân ca trùng lặp trong khoảng thời gian',
      },
    },
    Validation: {
      FAILED: { code: 'VAL_001', message: 'Validation failed' },
    },
    Onboarding: {
      PLAN_NOT_FOUND: {
        code: 'ONB_001',
        message: 'Kế hoạch onboarding không được tìm thấy',
      },
      PLAN_NAME_REQUIRED: {
        code: 'ONB_002',
        message: 'Tên kế hoạch onboarding là bắt buộc',
      },
      PROGRESS_NOT_FOUND: {
        code: 'ONB_003',
        message: 'Tiến trình onboarding không được tìm thấy',
      },
      PROGRESS_ALREADY_EXISTS: {
        code: 'ONB_004',
        message: 'Nhân viên đã có tiến trình onboarding cho kế hoạch này',
      },
      CANNOT_RESUME: {
        code: 'ONB_005',
        message: 'Chỉ có thể tiếp tục onboarding đã bị tạm dừng',
      },
      TEMPLATE_ALREADY_EXISTS: {
        code: 'ONB_006',
        message:
          'Phòng ban và vị trí này đã có template onboarding. Vui lòng chỉnh sửa template hiện có.',
      },
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
