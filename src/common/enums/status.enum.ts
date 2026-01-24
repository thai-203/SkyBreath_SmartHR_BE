export enum Status {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    PENDING = 'pending',
    SUSPENDED = 'suspended',
}

export enum EmployeeStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
    ON_LEAVE = 'on_leave',
    RESIGNED = 'resigned',
    TERMINATED = 'terminated',
}

export enum AttendanceStatus {
    PRESENT = 'present',
    ABSENT = 'absent',
    LATE = 'late',
    HALF_DAY = 'half_day',
    ON_LEAVE = 'on_leave',
}

export enum PayrollStatus {
    DRAFT = 'draft',
    PENDING = 'pending',
    APPROVED = 'approved',
    PAID = 'paid',
    CANCELLED = 'cancelled',
}
