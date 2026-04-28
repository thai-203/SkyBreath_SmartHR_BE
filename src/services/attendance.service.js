import { setRequestContextValue } from '../common/context/request-context';
import { BadRequestException, NotFoundException } from '../common/exceptions';
import { AppMessages } from '../common/constants/app-messages.constant';
import { parseUserAgent } from '../common/utils/user-agent.util';
import { computeSimilarity } from '../common/utils/vector.utils';
import { ActionLogsRepository } from '../repositories/action-logs.repository';
import { AttendanceSecurityConfigRepository } from '../repositories/attendance-security-config.repository';
import { AttendanceRepository } from '../repositories/attendances.repository';
import { EmployeesRepository } from '../repositories/employees.repository';
import { FaceDataRepository } from '../repositories/face-data.repository';
import { FaceRecognitionConfigRepository } from '../repositories/face-recognition-config.repository';
import { ShiftSchedulesRepository } from '../repositories/shift-schedules.repository';
import { ArcFaceService } from './arcface.service';
import { IpService } from './ip.service';
import { AttendanceSecurityStatusRepository } from '../repositories/attendance-security-status.repository';
import { AttendanceBlockingConfigRepository } from '../repositories/attendance-blocking-config.repository';
import { RequestsRepository } from '../repositories/requests.repository';

export class AttendanceService {
  constructor() {
    this.attendanceRepo = new AttendanceRepository();
    this.employeeRepository = new EmployeesRepository();
    this.shiftRepo = new ShiftSchedulesRepository();
    this.faceDataRepo = new FaceDataRepository();
    this.securityRepo = new AttendanceSecurityConfigRepository();
    this.pythonService = new ArcFaceService();
    this.faceConfigRepo = new FaceRecognitionConfigRepository();
    this.ipService = new IpService();
    this.actionLogRepo = new ActionLogsRepository();
    this.securityStatusRepo = new AttendanceSecurityStatusRepository();
    this.attendanceBlockingConfigRepo =
      new AttendanceBlockingConfigRepository();
    this.requestRepo = new RequestsRepository();
  }

  async getTodayContext(userId) {
    // Validate input
    if (!userId || typeof userId !== 'number') {
      throw new BadRequestException(AppMessages.Errors.User.NOT_FOUND);
    }

    const employee = await this.employeeRepository.findByUserId(userId);

    // Validate employee exists
    if (!employee) {
      throw new NotFoundException(AppMessages.Errors.Employee.NOT_FOUND);
    }

    const employeeId = employee.id;
    const today = new Date().toLocaleDateString('en-CA');
    const now = new Date();

    const shiftSchedule = await this.shiftRepo.findTodayShiftByEmpId({
      employeeId,
      today,
    });

    const attendanceRecord = await this.attendanceRepo.findOne({
      employeeId,
      today,
    });

    const faceCount = await this.faceDataRepo.countData(employeeId);
    const faceConfig = await this.faceConfigRepo.findOneConfig();

    const securityStatus =
      await this.securityStatusRepo.findByEmployeeId(employeeId);

    const blockedUntil = new Date(securityStatus?.blockedUntil);

    const isBlocked =
      securityStatus?.blockedUntil &&
      !isNaN(blockedUntil) &&
      blockedUntil > now;

    if (!isBlocked && securityStatus?.blockedUntil) {
      await this.securityStatusRepo.resetStatus(employeeId);
    }

    const shifts = (shiftSchedule || []).map((s) => s.shift).filter(Boolean);

    const currentShift = this._getCurrentShift(shifts);

    const recentRecords = await this.actionLogRepo.findRecentAttendanceLogs(
      userId,
      5,
    );

    const securityConfig = await this.securityRepo.findOneConfig();

    const applyLevel = securityConfig?.applyTo;

    let isApplySecurity = false;

    if (applyLevel === 'ALL') {
      isApplySecurity = true;
    }

    if (applyLevel === 'EMPLOYEE') {
      const attendanceLevel = securityConfig?.targetIds;
      if (attendanceLevel.includes(employeeId)) {
        isApplySecurity = true;
      }
    }

    const overtimeRaw = await this.requestRepo.getTodayOvertime(
      employeeId,
      today,
    );
    const firstOt = overtimeRaw?.items?.[0] || null;

    return {
      userName: employee?.fullName ?? '',
      hasBiometric: faceCount > 0,
      hasShift: shifts.length > 0 || !!firstOt,
      currentShift:
        currentShift || firstOt
          ? {
              shiftId: currentShift?.id || `ot-${firstOt?.request?.id || '0'}`,
              name: currentShift?.shiftName || 'Ca OT',
              startTime: currentShift?.startTime || firstOt?.startTime,
              endTime: currentShift?.endTime || firstOt?.endTime,
            }
          : null,

      shifts: [
        ...shifts.map((shift) => ({
          shiftId: shift.id,
          name: shift.shiftName,
          startTime: shift.startTime,
          endTime: shift.endTime,
        })),
        ...(firstOt
          ? [
              {
                shiftId: `ot-${firstOt.request?.id || '0'}`,
                name: 'Ca OT',
                startTime: firstOt.startTime,
                endTime: firstOt.endTime,
              },
            ]
          : []),
      ],
      overtime: firstOt,
      totalWorkMinutes: currentShift
        ? (() => {
            if (!currentShift?.startTime || !currentShift?.endTime) return 0;
            const plannedMinutes =
              this._timeToMinutes(currentShift.endTime) -
              this._timeToMinutes(currentShift.startTime);
            if (
              currentShift.breakStartTime &&
              currentShift.breakEndTime &&
              this._timeToMinutes(currentShift.breakEndTime) >
                this._timeToMinutes(currentShift.breakStartTime)
            ) {
              const breakDuration =
                this._timeToMinutes(currentShift.breakEndTime) -
                this._timeToMinutes(currentShift.breakStartTime);
              return Math.max(0, plannedMinutes - breakDuration);
            }
            return plannedMinutes;
          })()
        : firstOt
          ? (() => {
              if (!firstOt?.startTime || !firstOt?.endTime) return 0;
              return (
                this._timeToMinutes(firstOt.endTime) -
                this._timeToMinutes(firstOt.startTime)
              );
            })()
          : 0,
      workDate: today,
      attendance: {
        checkInTime: attendanceRecord?.checkInTime ?? null,
        checkOutTime: attendanceRecord?.checkOutTime ?? null,
        totalWorkMinutes: attendanceRecord?.totalWorkMinutes ?? null,
        overtimeMinutes: attendanceRecord?.overtimeMinutes ?? null,
      },
      isBlocked,
      security: faceConfig
        ? {
            maxFacesAllowed: faceConfig.maxFacesAllowed,
            livenessMode: faceConfig.livenessMode,
            requiredFrames: faceConfig.requiredFrames,
            captureIntervalMs: faceConfig.captureIntervalMs,
            faceDetectionMinSize: faceConfig.faceDetectionMinSize,
            requireLocationCheck: isApplySecurity
              ? securityConfig?.requireLocationCheck
              : false,
          }
        : {
            maxFacesAllowed: 1,
            livenessMode: 'SINGLE_FRAME',
            requiredFrames: 1,
            captureIntervalMs: 1000,
            faceDetectionMinSize: 80,
            requireLocationCheck: false,
          },
      recentRecords:
        recentRecords.map((rec) => ({
          actionId: rec.id,
          actionType: rec.actionType,
          createdAt: rec.createdAt,
          deviceInfo: parseUserAgent(rec.userAgent),
          status: rec.status,
        })) || [],
    };
  }

  // ── Shared: security validate (IP + VPN + Location) ──────────────────
  async _validateSecurityChecks(location, securityConfig) {
    if (securityConfig?.requireIpCheck) {
      const ipValid = await this.ipService.validate(
        location?.clientIp,
        securityConfig,
      );
      if (!ipValid)
        throw new BadRequestException(
          AppMessages.Errors.Attendance.IP_NOT_ALLOWED,
        );
    }

    if (securityConfig?.blockVpn && location?.clientIp) {
      const isVpn = await this.ipService.detectVpn(location.clientIp);
      if (isVpn)
        throw new BadRequestException(
          AppMessages.Errors.Attendance.VPN_DETECTED,
        );
    }

    if (
      securityConfig?.requireLocationCheck &&
      location?.lat &&
      location?.lng
    ) {
      const gpsValid = this.ipService.validateLocation(
        location,
        securityConfig,
      );
      if (!gpsValid)
        throw new BadRequestException(
          AppMessages.Errors.Attendance.LOCATION_OUT_OF_RANGE,
        );
    }
  }

  // ── Shared: face validate (liveness + size + match) ──────────────────
  async _validateFace(employeeId, files, faceConfig) {
    const faceDataList = await this.faceDataRepo.findByEmployeeId(employeeId);
    if (!faceDataList.length)
      throw new NotFoundException(
        AppMessages.Errors.Attendance.NO_FACE_DATA_REGISTERED,
      );

    const pyResult = await this.pythonService.extractMulti(files);

    if (!pyResult.success)
      throw new BadRequestException(
        AppMessages.Errors.Attendance.FACE_RECOGNITION_FAILED,
      );

    const threshold = Number(faceConfig?.recognitionThreshold ?? 0.5);
    const metric = faceConfig?.similarityMetric ?? 'cosine';
    const spoofThreshold = Number(faceConfig?.spoofThreshold ?? 0.5);
    const livenessMode = faceConfig?.livenessMode ?? 'SINGLE_FRAME';
    const requiredFrames = Number(faceConfig?.requiredFrames ?? 1);
    const minSize = faceConfig?.faceDetectionMinSize ?? 80;

    // Liveness check
    if (livenessMode === 'MULTI_FRAME') {
      if (files.length < requiredFrames)
        throw new BadRequestException(
          `${AppMessages.Errors.Attendance.INSUFFICIENT_FRAMES}`
            .replace('{requiredFrames}', requiredFrames)
            .replace('{fileCount}', files.length),
        );
      if (pyResult.avg_liveness_score < spoofThreshold)
        throw new BadRequestException(
          `${AppMessages.Errors.Attendance.LIVENESS_SCORE_LOW}`
            .replace('{score}', pyResult.avg_liveness_score.toFixed(2))
            .replace('{threshold}', spoofThreshold),
        );
    } else {
      const firstFrame = pyResult.frames?.[0];
      if (!firstFrame || firstFrame.liveness_score < spoofThreshold)
        throw new BadRequestException(
          AppMessages.Errors.Attendance.SPOOF_DETECTED,
        );
    }

    // Face size check
    const firstValidFrame = pyResult.frames?.find((f) => f.face_count > 0);
    if (!firstValidFrame)
      throw new NotFoundException(
        AppMessages.Errors.Attendance.NO_FACE_DETECTED,
      );

    const validFace = firstValidFrame.faces.find((face) => {
      const [x, y, w, h] = face.bbox;
      return Math.min(w, h) >= minSize;
    });
    if (!validFace)
      throw new BadRequestException(
        `${AppMessages.Errors.Attendance.FACE_TOO_SMALL}`.replace(
          '{minSize}',
          minSize,
        ),
      );

    // Match embedding
    const newEmbedding = firstValidFrame.faces[0].embedding;
    const matched = await this._matchEmbedding(
      newEmbedding,
      faceDataList,
      threshold,
      metric,
    );
    if (!matched)
      throw new BadRequestException(
        AppMessages.Errors.Attendance.FACE_NOT_MATCHED,
      );
  }

  // ── POST /attendance/check-in ─────────────────────────────────────────
  async checkIn(employeeId, files, location) {
    // Validate input
    if (!employeeId || typeof employeeId !== 'number') {
      throw new BadRequestException(AppMessages.Errors.Employee.NOT_FOUND);
    }

    if (!files || files.length === 0)
      throw new BadRequestException(
        AppMessages.Errors.Attendance.NO_IMAGE_PROVIDED,
      );

    // Validate employee exists
    const employee = await this.employeeRepository.findById(employeeId);
    if (!employee) {
      throw new NotFoundException(AppMessages.Errors.Employee.NOT_FOUND);
    }

    const securityStatus =
      await this.securityStatusRepo.findByEmployeeId(employeeId);
    if (
      securityStatus?.blockedUntil &&
      !isNaN(new Date(securityStatus?.blockedUntil).getTime()) &&
      new Date(securityStatus?.blockedUntil).getTime() > new Date().getTime()
    ) {
      throw new BadRequestException(
        'Bạn đã vượt quá giới hạn check-in thất bại. Vui lòng liên hệ quản lý.',
      );
    }
    setRequestContextValue('customAction', 'check_in');
    setRequestContextValue(
      'evidenceImageUrl',
      files?.[0]?.path ??
        files?.[0]?.secure_url ??
        files?.[0]?.url ??
        files?.[0]?.location ??
        null,
    );

    const today = new Date().toLocaleDateString('en-CA');
    const shiftSchedules = await this.shiftRepo.findTodayShiftByEmpId({
      employeeId,
      today,
    });
    const shifts = shiftSchedules.map((s) => s.shift).filter(Boolean);

    const overtimeRaw = await this.requestRepo.getTodayOvertime(
      employeeId,
      today,
    );
    const overtime = overtimeRaw?.items?.[0];

    if (shifts.length === 0 && !overtime)
      throw new NotFoundException(AppMessages.Errors.Attendance.NO_SHIFT_TODAY);

    const securityConfig = await this.securityRepo.findOneConfig();

    let isApplySecurity = false;

    if (securityConfig.applyTo === 'ALL') {
      isApplySecurity = true;
    }

    if (securityConfig.applyTo === 'EMPLOYEE') {
      const attendanceLevel = securityConfig.targetIds;
      if (attendanceLevel.includes(employeeId)) {
        isApplySecurity = true;
      }
    }

    if (isApplySecurity) {
      await this._validateSecurityChecks(location, securityConfig);
    }

    const faceConfig = await this.faceConfigRepo.findOneConfig();
    await this._validateFace(employeeId, files, faceConfig);

    let shiftSchedule = null;
    let lateMinutes = 0;
    const now = new Date();

    if (shifts && shifts.length > 0) {
      const shift = this._getCurrentShift(shifts);
      shiftSchedule = shiftSchedules.find((ss) => ss.shiftId === shift.id);
      lateMinutes = this._calcLateMinutes(now, shift.startTime);
    } else if (overtime) {
      lateMinutes = this._calcLateMinutes(now, overtime.startTime);
    }

    let record = await this.attendanceRepo.findOne({ employeeId, today });
    if (!record) {
      record = await this.attendanceRepo.create({
        employeeId,
        workDate: today,
        shiftScheduleId: shifts.length > 0 ? shiftSchedule.id : null,
        attendanceType: 'FACE',
        checkInTime: now,
        lateMinutes,
        attendanceStatus: lateMinutes > 0 ? 'LATE' : 'PRESENT',
      });
    } else {
      throw new BadRequestException(
        AppMessages.Errors.Attendance.ALREADY_CHECKED_IN,
      );
    }
    setRequestContextValue('customAction', null);
    setRequestContextValue('evidenceImageUrl', null);

    if (securityStatus) {
      await this.securityStatusRepo.resetStatus(employeeId);
    }
    setRequestContextValue('customAction', 'check_in');
    setRequestContextValue(
      'evidenceImageUrl',
      files?.[0]?.path ??
        files?.[0]?.secure_url ??
        files?.[0]?.url ??
        files?.[0]?.location ??
        null,
    );

    return { success: true, checkInTime: now.toISOString(), lateMinutes };
  }

  // ── POST /attendance/check-out ────────────────────────────────────────
  async checkOut(employeeId, files, location) {
    // Validate input
    if (!employeeId || typeof employeeId !== 'number') {
      throw new BadRequestException(AppMessages.Errors.Employee.NOT_FOUND);
    }

    if (!files || files.length === 0)
      throw new BadRequestException(
        AppMessages.Errors.Attendance.NO_IMAGE_PROVIDED,
      );

    // Validate employee exists
    const employee = await this.employeeRepository.findById(employeeId);
    if (!employee) {
      throw new NotFoundException(AppMessages.Errors.Employee.NOT_FOUND);
    }

    const securityStatus =
      await this.securityStatusRepo.findByEmployeeId(employeeId);
    if (
      securityStatus?.blockedUntil &&
      !isNaN(new Date(securityStatus?.blockedUntil).getTime()) &&
      new Date(securityStatus?.blockedUntil).getTime() > new Date().getTime()
    ) {
      throw new BadRequestException(
        'Bạn đã vượt quá giới hạn check-out thất bại. Vui lòng liên hệ quản lý.',
      );
    }
    setRequestContextValue('customAction', 'check_out');
    setRequestContextValue(
      'evidenceImageUrl',
      files?.[0]?.path ??
        files?.[0]?.secure_url ??
        files?.[0]?.url ??
        files?.[0]?.location ??
        null,
    );
    const today = new Date().toLocaleDateString('en-CA');

    const overtimeRaw = await this.requestRepo.getTodayOvertime(
      employeeId,
      today,
    );
    const overtime = overtimeRaw?.items?.[0];

    const record = await this.attendanceRepo.findOne({ employeeId, today });
    if (!record?.checkInTime)
      throw new BadRequestException(
        AppMessages.Errors.Attendance.NOT_CHECKED_IN,
      );
    if (record.checkOutTime)
      throw new BadRequestException(
        AppMessages.Errors.Attendance.ALREADY_CHECKED_OUT,
      );

    const securityConfig = await this.securityRepo.findOneConfig();

    let isApplySecurity = false;

    if (securityConfig.applyTo === 'ALL') {
      isApplySecurity = true;
    }

    if (securityConfig.applyTo === 'EMPLOYEE') {
      const attendanceLevel = securityConfig.targetIds;
      if (attendanceLevel.includes(employeeId)) {
        isApplySecurity = true;
      }
    }

    if (isApplySecurity) {
      await this._validateSecurityChecks(location, securityConfig);
    }

    const faceConfig = await this.faceConfigRepo.findOneConfig();
    await this._validateFace(employeeId, files, faceConfig);

    const now = new Date();
    const checkInMs = new Date(record.checkInTime).getTime();
    let totalWorkMinutes = Math.round((now.getTime() - checkInMs) / 60000);
    let earlyLeaveMinutes = 0;

    const shiftSchedule = await this.shiftRepo.findTodayShiftByEmpId({
      employeeId,
      today,
    });
    const shifts = shiftSchedule.map((s) => s.shift).filter(Boolean);

    if (shifts.length > 0) {
      const shift = this._getCurrentShift(shifts);

      // Subtract break time from totalWorkMinutes if break time exists
      if (
        shift &&
        shift.breakStartTime !== '00:00:00' &&
        shift.breakEndTime !== '00:00:00'
      ) {
        const breakStartMinutes = this._timeToMinutes(shift.breakStartTime);
        const breakEndMinutes = this._timeToMinutes(shift.breakEndTime);
        const breakDurationMinutes = breakEndMinutes - breakStartMinutes;
        if (breakDurationMinutes > 0) {
          totalWorkMinutes = Math.max(
            0,
            totalWorkMinutes - breakDurationMinutes,
          );
        }
      }

      earlyLeaveMinutes = shift ? this._calcEarlyLeave(now, shift.endTime) : 0;
    } else if (overtime) {
      earlyLeaveMinutes = this._calcEarlyLeave(now, overtime.endTime) || 0;
    }

    // Calculate overtimeMinutes based on overtime request if available
    let overtimeMinutes = 0;
    if (overtime) {
      const overtimeStartTime = new Date(`${today}T${overtime.startTime}`);
      const overtimeEndTime = new Date(`${today}T${overtime.endTime}`);
      const checkInTime = new Date(record.checkInTime);

      // Determine the actual start time for overtime calculation
      // If checkInTime > overtimeStartTime, use checkInTime instead
      const actualOvertimeStart =
        checkInTime > overtimeStartTime ? checkInTime : overtimeStartTime;

      if (checkInTime > overtimeEndTime) {
        overtimeMinutes = 0;
      } else if (now >= actualOvertimeStart) {
        if (now >= overtimeEndTime) {
          // Already past overtime end time, use full overtime duration from actual start
          overtimeMinutes = Math.round(
            (overtimeEndTime.getTime() - actualOvertimeStart.getTime()) / 60000,
          );
        } else {
          // Still in overtime period, use time from actual start till now
          overtimeMinutes = Math.round(
            (now.getTime() - actualOvertimeStart.getTime()) / 60000,
          );
        }
      }
      // If now < actualOvertimeStart: overtimeMinutes stays 0
    }
    // If no overtime: overtimeMinutes stays 0

    record.checkOutTime = now;
    record.totalWorkMinutes = totalWorkMinutes;
    record.earlyLeaveMinutes = earlyLeaveMinutes;
    record.overtimeMinutes = overtimeMinutes;
    if (earlyLeaveMinutes > 0) record.attendanceStatus = 'EARLY_LEAVE';

    await this.attendanceRepo.update(record.id, record);

    setRequestContextValue('customAction', null);
    setRequestContextValue('evidenceImageUrl', null);

    if (securityStatus) {
      await this.securityStatusRepo.resetStatus(employeeId);
    }
    setRequestContextValue('customAction', 'check_out');
    setRequestContextValue(
      'evidenceImageUrl',
      files?.[0]?.path ??
        files?.[0]?.secure_url ??
        files?.[0]?.url ??
        files?.[0]?.location ??
        null,
    );

    return {
      success: true,
      checkOutTime: now.toISOString(),
      totalWorkMinutes,
      earlyLeaveMinutes,
      overtimeMinutes,
    };
  }

  async _matchEmbedding(newEmb, faceDataList, threshold, metric) {
    const results = faceDataList.map((fd) => {
      const storedEmb = JSON.parse(fd.faceVector);
      const sim = computeSimilarity(newEmb, storedEmb, metric);
      return sim >= threshold;
    });
    return results.some(Boolean);
  }

  _timeToMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }

  _calcLateMinutes(now, shiftStartTime) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = this._timeToMinutes(shiftStartTime);
    return Math.max(0, nowMinutes - startMinutes);
  }

  _calcEarlyLeave(now, shiftEndTime) {
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const endMinutes = this._timeToMinutes(shiftEndTime);
    return Math.max(0, endMinutes - nowMinutes);
  }

  _getCurrentShift(shifts) {
    const today = new Date().toLocaleDateString('en-CA');
    const now = new Date();

    if (!shifts || shifts.length === 0) return null;

    // Sort ca theo startTime tăng dần
    const sorted = [...shifts].sort((a, b) => {
      return a.startTime.localeCompare(b.startTime);
    });

    // Convert helper
    const toDate = (time) => new Date(`${today} ${time}`);

    // 1. Nếu nằm trong ca nào → lấy ca đó
    for (const shift of sorted) {
      const start = toDate(shift.startTime);
      const end = toDate(shift.endTime);
      if (now >= start && now <= end) {
        return shift;
      }
    }

    // 2. Nếu trước ca đầu → lấy ca đầu
    const firstShift = sorted[0];
    if (now < toDate(firstShift.startTime)) {
      return firstShift;
    }

    // 3. Nếu sau ca cuối → lấy ca cuối
    const lastShift = sorted[sorted.length - 1];
    if (now > toDate(lastShift.endTime)) {
      return lastShift;
    }

    // 4. Nếu nằm giữa 2 ca → dùng midpoint
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];

      const endCurrent = toDate(current.endTime);
      const startNext = toDate(next.startTime);

      if (now > endCurrent && now < startNext) {
        // midpoint
        const mid = new Date((endCurrent.getTime() + startNext.getTime()) / 2);

        return now < mid ? current : next;
      }
    }

    return null;
  }
}
