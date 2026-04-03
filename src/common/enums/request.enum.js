export const ApproverType = {
    DIRECT_MANAGER: 'DIRECT_MANAGER',
    ROLE: 'ROLE',
};

export const TrackingCycle = {
    DAY: 'DAY',
    WEEK: 'WEEK',
    MONTH: 'MONTH',
    YEAR: 'YEAR',
};

export const PolicyUnit = {
    DAY: 'DAY',
    HOUR: 'HOUR',
    MINUTE: 'MINUTE',
    TIME: 'TIME',
};

export const RequestGroupCode = {
    LEAVE: 'LEAVE',
    OVERTIME: 'OVERTIME',
    BUSINESS_TRIP: 'BUSINESS_TRIP',
    WORK_FROM_HOME: 'WORK_FROM_HOME',
    LATE_EARLY: 'LATE_EARLY',
    ATTENDANCE_CORRECTION: 'ATTENDANCE_CORRECTION',
    OTHER: 'OTHER',
};

// Trạng thái đơn từ
export const RequestStatus = {
    DRAFT: 'DRAFT',           // Lưu nháp — chưa gửi duyệt
    PENDING: 'PENDING',       // Đang chờ duyệt (đã gửi)
    APPROVED: 'APPROVED',     // Đã duyệt hoàn tất (tất cả cấp đã duyệt)
    REJECTED: 'REJECTED',     // Bị từ chối tại một cấp duyệt
    CANCELLED: 'CANCELLED',   // Người tạo hủy (chỉ khi chưa có cấp nào APPROVED)
};

// Trạng thái từng cấp duyệt trong request_approval_levels
export const ApprovalLevelStatus = {
    PENDING: 'PENDING',       // Chờ người duyệt xử lý
    APPROVED: 'APPROVED',     // Cấp này đã duyệt
    REJECTED: 'REJECTED',     // Cấp này từ chối (đơn kết thúc)
    REVOKED: 'REVOKED',       // Người duyệt thu hồi quyết định approve → về PENDING để xử lý lại
};
