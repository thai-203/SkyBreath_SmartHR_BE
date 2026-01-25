export const SystemErrors = {
    Auth: {
        INVALID_CREDENTIALS: { code: 'AUTH_001', message: 'Invalid credentials' },
        TOKEN_EXPIRED: { code: 'AUTH_002', message: 'Token expired' },
        TOKEN_INVALID: { code: 'AUTH_003', message: 'Invalid token' },
        UNAUTHORIZED: { code: 'AUTH_004', message: 'Unauthorized' },
        FORBIDDEN: { code: 'AUTH_005', message: 'Forbidden' },
    },
    User: {
        NOT_FOUND: { code: 'USER_001', message: 'User not found' },
        ALREADY_EXISTS: { code: 'USER_002', message: 'User already exists' },
        INVALID_PASSWORD: { code: 'USER_003', message: 'Invalid password' },
        INACTIVE: { code: 'USER_004', message: 'User account is inactive' },
    },
    Employee: {
        NOT_FOUND: { code: 'EMP_001', message: 'Employee not found' },
        ALREADY_EXISTS: { code: 'EMP_002', message: 'Employee already exists' },
        CODE_DUPLICATE: { code: 'EMP_003', message: 'Employee code duplicate' },
    },
    Department: {
        NOT_FOUND: { code: 'DEPT_001', message: 'Department not found' },
        ALREADY_EXISTS: { code: 'DEPT_002', message: 'Department already exists' },
        HAS_EMPLOYEES: { code: 'DEPT_003', message: 'Department has employees' },
    },
    Attendance: {
        ALREADY_CHECKED_IN: { code: 'ATT_001', message: 'Already checked in' },
        NOT_CHECKED_IN: { code: 'ATT_002', message: 'Not checked in' },
        NOT_FOUND: { code: 'ATT_003', message: 'Attendance record not found' },
    },
    Payroll: {
        NOT_FOUND: { code: 'PAY_001', message: 'Payroll not found' },
        ALREADY_PROCESSED: { code: 'PAY_002', message: 'Payroll already processed' },
        INVALID_PERIOD: { code: 'PAY_003', message: 'Invalid payroll period' },
    },
    Validation: {
        FAILED: { code: 'VAL_001', message: 'Validation failed' },
    },
    General: {
        INTERNAL_SERVER_ERROR: { code: 'ERR_001', message: 'Internal Server Error' },
        BAD_REQUEST: { code: 'ERR_002', message: 'Bad Request' },
        NOT_FOUND: { code: 'ERR_003', message: 'Resource not found' },
        RESOURCE_ALREADY_EXISTS: { code: 'ERR_004', message: 'Resource already exists' },
    },
} as const;

export type SystemError = {
    readonly code: string;
    readonly message: string;
};
