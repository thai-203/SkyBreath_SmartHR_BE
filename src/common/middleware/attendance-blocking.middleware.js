// filters/attendance-blocking.filter.js

import { AttendanceBlockingConfigRepository } from '../../repositories/attendance-blocking-config.repository';
import { AttendanceSecurityStatusRepository } from '../../repositories/attendance-security-status.repository';
import { AppMessages } from '../constants/app-messages.constant';
import {
  getRequestContext,
  setRequestContextValue,
} from '../context/request-context';

/**
 * Map từ error message/code → errorType trong blocking config
 */
const CODE_TO_ERROR_TYPE = Object.fromEntries(
  Object.values(AppMessages.Errors.Attendance)
    .filter((entry) => entry.errorType)
    .map((entry) => [entry.code, entry.errorType]),
);

export class AttendanceBlockingMiddleware {
  constructor() {
    this.blockingConfigRepo = new AttendanceBlockingConfigRepository();
    this.securityStatusRepo = new AttendanceSecurityStatusRepository();
  }

  /**
   * Gọi sau khi catch exception từ checkIn / checkOut
   * @param {Error} error
   * @param {number} employeeId
   */
  async handle(error, employeeId) {
    const ctx = getRequestContext();
    const originalAction = ctx?.customAction; // { method, path, customAction }

    // Exception cần mang theo .code (xem phần 3)
    const errorType = CODE_TO_ERROR_TYPE[error.errorCode];
    if (!errorType || !employeeId) return;

    const config =
      await this.blockingConfigRepo.findActiveByErrorType(errorType);
    if (!config) return;

    let isApplySecurity = false;

    if (config.applyTo === 'ALL') {
      isApplySecurity = true;
    }

    if (config.applyTo === 'EMPLOYEE') {
      const attendanceLevel = config.targetIds;
      if (attendanceLevel.includes(employeeId)) {
        isApplySecurity = true;
      }
    }

    if (isApplySecurity) {
      setRequestContextValue('customAction', null);

      await this._incrementAndMaybeBlock(
        employeeId,
        errorType,
        config,
        originalAction,
      );
    }
  }

  async _incrementAndMaybeBlock(employeeId, errorType, config, originalAction) {
    const now = new Date();
    const status = await this.securityStatusRepo.findByEmployeeId(employeeId);
    const counts = { ...(status?.failureCounts ?? {}) };
    counts[errorType] = (counts[errorType] ?? 0) + 1;

    let blockedUntil = status?.blockedUntil ?? null;

    if (counts[errorType] >= config.maxRetryLimit) {
      blockedUntil = new Date(
        now.getTime() + config.blockDurationMinutes * 60_000,
      );
      counts[errorType] = 0; // reset sau khi block
    }

    await this.securityStatusRepo.saveStatus({
      ...status, // có id → UPDATE, không có → INSERT
      employeeId,
      failureCounts: counts,
      lastFailureAt: now,
      blockedUntil,
    });
    setRequestContextValue('customAction', originalAction);
  }
}
