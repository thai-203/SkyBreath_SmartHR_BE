import {
  getRequestContext,
  setRequestContextValue,
} from '../common/context/request-context';
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
  }

  async getTodayContext(userId) {
    const employee = await this.employeeRepository.findByUserId(userId);
    const employeeId = employee.id;
    const today = new Date().toISOString().slice(0, 10);
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

    const isBlocked =
      securityStatus?.blockedUntil &&
      new Date(securityStatus.blockedUntil) > now;

    if (!isBlocked && securityStatus?.blockedUntil) {
      await this.securityStatusRepo.resetStatus(employeeId);
    }

    const shift = shiftSchedule?.shift ?? null;

    const recentRecords = await this.actionLogRepo.findRecentAttendanceLogs(
      userId,
      5,
    );

    const securityConfig = await this.securityRepo.findOneConfig();

    return {
      userName: employee?.fullName ?? '',
      hasBiometric: faceCount > 0,
      hasShift: !!shift,
      shift: shift
        ? { startTime: shift.startTime, endTime: shift.endTime }
        : null,
      totalWorkMinutes: shift?.totalWorkMinutes ?? 480,
      workDate: today,
      attendance: {
        checkInTime: attendanceRecord?.checkInTime ?? null,
        checkOutTime: attendanceRecord?.checkOutTime ?? null,
      },
      isBlocked,
      security: faceConfig
        ? {
            maxFacesAllowed: faceConfig.maxFacesAllowed,
            livenessMode: faceConfig.livenessMode,
            requiredFrames: faceConfig.requiredFrames,
            captureIntervalMs: faceConfig.captureIntervalMs,
            faceDetectionMinSize: faceConfig.faceDetectionMinSize,
            requireLocationCheck: securityConfig.requireLocationCheck,
          }
        : {
            maxFacesAllowed: 1,
            livenessMode: 'MULTI_FRAME',
            requiredFrames: 10,
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
    const securityStatus =
      await this.securityStatusRepo.findByEmployeeId(employeeId);
    setRequestContextValue('customAction', 'check_in');

    if (!files || files.length === 0)
      throw new NotFoundException(
        AppMessages.Errors.Attendance.NO_IMAGE_PROVIDED,
      );

    const today = new Date().toISOString().slice(0, 10);

    const shiftSchedule = await this.shiftRepo.findTodayShiftByEmpId({
      employeeId,
      today,
    });
    if (!shiftSchedule)
      throw new NotFoundException(AppMessages.Errors.Attendance.NO_SHIFT_TODAY);

    const securityConfig = await this.securityRepo.findOneConfig();
    await this._validateSecurityChecks(location, securityConfig);

    const faceConfig = await this.faceConfigRepo.findOneConfig();
    await this._validateFace(employeeId, files, faceConfig);

    const shift = shiftSchedule.shift;
    const now = new Date();
    const lateMinutes = this._calcLateMinutes(now, shift.startTime);

    let record = await this.attendanceRepo.findOne({ employeeId, today });
    if (!record) {
      record = await this.attendanceRepo.create({
        employeeId,
        workDate: today,
        shiftScheduleId: shiftSchedule.id,
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

    if (securityStatus) {
      await this.securityStatusRepo.resetStatus(employeeId);
    }
    setRequestContextValue('customAction', 'check_in');

    return { success: true, checkInTime: now.toISOString(), lateMinutes };
  }

  // ── POST /attendance/check-out ────────────────────────────────────────
  async checkOut(employeeId, files, location) {
    const securityStatus =
      await this.securityStatusRepo.findByEmployeeId(employeeId);
    setRequestContextValue('customAction', 'check_out');

    if (!files || files.length === 0)
      throw new BadRequestException(
        AppMessages.Errors.Attendance.NO_IMAGE_PROVIDED,
      );

    const today = new Date().toISOString().slice(0, 10);

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
    await this._validateSecurityChecks(location, securityConfig);

    const faceConfig = await this.faceConfigRepo.findOneConfig();
    await this._validateFace(employeeId, files, faceConfig);

    const now = new Date();
    const checkInMs = new Date(record.checkInTime).getTime();
    const totalWorkMinutes = Math.round((now.getTime() - checkInMs) / 60000);

    const shift = record.shiftSchedule?.shift;
    const earlyLeaveMinutes = shift
      ? this._calcEarlyLeave(now, shift.endTime)
      : 0;
    const plannedMinutes = shift?.totalWorkMinutes ?? 480;
    const overtimeMinutes = Math.max(0, totalWorkMinutes - plannedMinutes);

    record.checkOutTime = now;
    record.totalWorkMinutes = totalWorkMinutes;
    record.earlyLeaveMinutes = earlyLeaveMinutes;
    record.overtimeMinutes = overtimeMinutes;
    if (earlyLeaveMinutes > 0) record.attendanceStatus = 'EARLY_LEAVE';

    await this.attendanceRepo.update(record.id, record);

    setRequestContextValue('customAction', null);

    if (securityStatus) {
      await this.securityStatusRepo.resetStatus(employeeId);
    }
    setRequestContextValue('customAction', 'check_out');

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
}
