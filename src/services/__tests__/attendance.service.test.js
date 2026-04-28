import { jest } from '@jest/globals';
import { AttendanceService } from '../attendance.service.js';
import { BadRequestException, NotFoundException } from '../../common/exceptions/index.js';
import { AppMessages } from '../../common/constants/app-messages.constant.js';

describe('AttendanceService - checkIn / checkOut', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    
    service = new AttendanceService();

    // Mock repositories
    service.attendanceRepo = { findOne: jest.fn(), create: jest.fn(), save: jest.fn(), update: jest.fn() };
    service.employeeRepository = { findById: jest.fn() };
    service.shiftRepo = { findTodayShiftByEmpId: jest.fn() };
    service.securityRepo = { findOneConfig: jest.fn() };
    service.faceConfigRepo = { findOneConfig: jest.fn() };
    service.securityStatusRepo = { findByEmployeeId: jest.fn(), resetStatus: jest.fn() };
    service.requestRepo = { getTodayOvertime: jest.fn() };
    
    // Mock internal validation methods to bypass their complex internal logic
    service._validateSecurityChecks = jest.fn();
    service._validateFace = jest.fn();
    service._getCurrentShift = jest.fn().mockReturnValue({ 
      id: 1, 
      startTime: '08:00', 
      endTime: '17:00',
      breakStartTime: '12:00:00',
      breakEndTime: '13:00:00'
    });
    service._calcLateMinutes = jest.fn().mockReturnValue(0);
    service._calcEarlyMinutes = jest.fn().mockReturnValue(0);
    service._calcTotalWorkMinutes = jest.fn().mockReturnValue(480);
    service._calcOvertimeMinutes = jest.fn().mockReturnValue(0);
  });

  const mockUserId = 1;
  const mockFiles = [{ path: 'test_image.jpg' }];
  const mockLocation = { clientIp: '127.0.0.1' };
  const mockEmployee = { id: mockUserId, fullName: 'Test User' };
  
  describe('checkIn', () => {
    it('1. Quăng lỗi nếu employeeId không hợp lệ', async () => {
      await expect(service.checkIn(null, mockFiles, mockLocation)).rejects.toThrow(BadRequestException);
      await expect(service.checkIn('abc', mockFiles, mockLocation)).rejects.toThrow(AppMessages.Errors.Employee.NOT_FOUND);
    });

    it('2. Quăng lỗi nếu không có file ảnh', async () => {
      await expect(service.checkIn(mockUserId, [], mockLocation)).rejects.toThrow(BadRequestException);
      await expect(service.checkIn(mockUserId, null, mockLocation)).rejects.toThrow(AppMessages.Errors.Attendance.NO_IMAGE_PROVIDED);
    });

    it('3. Quăng lỗi nếu không tìm thấy nhân viên', async () => {
      service.employeeRepository.findById.mockResolvedValue(null);
      await expect(service.checkIn(mockUserId, mockFiles, mockLocation)).rejects.toThrow(NotFoundException);
      await expect(service.checkIn(mockUserId, mockFiles, mockLocation)).rejects.toThrow(AppMessages.Errors.Employee.NOT_FOUND);
    });

    it('4. Quăng lỗi nếu nhân viên đang bị block check-in (vượt quá số lần thử)', async () => {
      service.employeeRepository.findById.mockResolvedValue(mockEmployee);
      // Giả lập thời hạn block ở tương lai
      service.securityStatusRepo.findByEmployeeId.mockResolvedValue({
        blockedUntil: new Date(Date.now() + 10000).toISOString()
      });

      await expect(service.checkIn(mockUserId, mockFiles, mockLocation)).rejects.toThrow(BadRequestException);
      await expect(service.checkIn(mockUserId, mockFiles, mockLocation)).rejects.toThrow('Bạn đã vượt quá giới hạn check-in thất bại. Vui lòng liên hệ quản lý.');
    });

    it('5. Quăng lỗi nếu không có ca làm việc và không có lịch tăng ca hôm nay', async () => {
      service.employeeRepository.findById.mockResolvedValue(mockEmployee);
      service.securityStatusRepo.findByEmployeeId.mockResolvedValue(null);
      service.shiftRepo.findTodayShiftByEmpId.mockResolvedValue([]); // Không có ca chính
      service.requestRepo.getTodayOvertime.mockResolvedValue({ items: [] }); // Không có tăng ca

      await expect(service.checkIn(mockUserId, mockFiles, mockLocation)).rejects.toThrow(NotFoundException);
      await expect(service.checkIn(mockUserId, mockFiles, mockLocation)).rejects.toThrow(AppMessages.Errors.Attendance.NO_SHIFT_TODAY);
    });

    it('6. Quăng lỗi nếu nhân viên đã check-in rồi', async () => {
      service.employeeRepository.findById.mockResolvedValue(mockEmployee);
      service.securityStatusRepo.findByEmployeeId.mockResolvedValue(null);
      service.shiftRepo.findTodayShiftByEmpId.mockResolvedValue([{ shiftId: 1, shift: { id: 1 } }]);
      service.requestRepo.getTodayOvertime.mockResolvedValue(null);
      service.securityRepo.findOneConfig.mockResolvedValue({ applyTo: 'NONE' });
      service.faceConfigRepo.findOneConfig.mockResolvedValue({});
      
      // Đã có bản ghi check-in trong DB
      service.attendanceRepo.findOne.mockResolvedValue({ id: 100, checkInTime: new Date() });

      await expect(service.checkIn(mockUserId, mockFiles, mockLocation)).rejects.toThrow(BadRequestException);
      await expect(service.checkIn(mockUserId, mockFiles, mockLocation)).rejects.toThrow(AppMessages.Errors.Attendance.ALREADY_CHECKED_IN);
    });

    it('7. Check-in thành công và trả về dữ liệu đúng', async () => {
      service.employeeRepository.findById.mockResolvedValue(mockEmployee);
      service.securityStatusRepo.findByEmployeeId.mockResolvedValue(null); // Không bị block
      service.shiftRepo.findTodayShiftByEmpId.mockResolvedValue([{ shiftId: 1, shift: { id: 1 } }]); // Có ca
      service.requestRepo.getTodayOvertime.mockResolvedValue(null);
      service.securityRepo.findOneConfig.mockResolvedValue({ applyTo: 'NONE' });
      service.faceConfigRepo.findOneConfig.mockResolvedValue({});
      service.attendanceRepo.findOne.mockResolvedValue(null); // Chưa check in
      service.attendanceRepo.create.mockResolvedValue({ id: 100 });

      const result = await service.checkIn(mockUserId, mockFiles, mockLocation);

      expect(service._validateFace).toHaveBeenCalled();
      expect(service.attendanceRepo.create).toHaveBeenCalled();
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('checkInTime');
      expect(result).toHaveProperty('lateMinutes', 0);
    });
  });

  describe('checkOut', () => {
    it('1. Quăng lỗi nếu employeeId không hợp lệ', async () => {
      await expect(service.checkOut(null, mockFiles, mockLocation)).rejects.toThrow(BadRequestException);
      await expect(service.checkOut('abc', mockFiles, mockLocation)).rejects.toThrow(AppMessages.Errors.Employee.NOT_FOUND);
    });

    it('2. Quăng lỗi nếu không có file ảnh', async () => {
      await expect(service.checkOut(mockUserId, [], mockLocation)).rejects.toThrow(BadRequestException);
    });

    it('3. Quăng lỗi nếu không tìm thấy nhân viên', async () => {
      service.employeeRepository.findById.mockResolvedValue(null);
      await expect(service.checkOut(mockUserId, mockFiles, mockLocation)).rejects.toThrow(NotFoundException);
    });

    it('4. Quăng lỗi nếu nhân viên đang bị block check-out', async () => {
      service.employeeRepository.findById.mockResolvedValue(mockEmployee);
      service.securityStatusRepo.findByEmployeeId.mockResolvedValue({
        blockedUntil: new Date(Date.now() + 10000).toISOString()
      });

      await expect(service.checkOut(mockUserId, mockFiles, mockLocation)).rejects.toThrow(BadRequestException);
      await expect(service.checkOut(mockUserId, mockFiles, mockLocation)).rejects.toThrow('Bạn đã vượt quá giới hạn check-out thất bại. Vui lòng liên hệ quản lý.');
    });

    it('5. Quăng lỗi nếu chưa check-in (không tìm thấy bản ghi)', async () => {
      service.employeeRepository.findById.mockResolvedValue(mockEmployee);
      service.securityStatusRepo.findByEmployeeId.mockResolvedValue(null);
      service.requestRepo.getTodayOvertime.mockResolvedValue(null);
      service.attendanceRepo.findOne.mockResolvedValue(null); // Không có bản ghi check-in

      await expect(service.checkOut(mockUserId, mockFiles, mockLocation)).rejects.toThrow(BadRequestException);
      await expect(service.checkOut(mockUserId, mockFiles, mockLocation)).rejects.toThrow(AppMessages.Errors.Attendance.NOT_CHECKED_IN);
    });

    it('6. Quăng lỗi nếu đã check-out rồi', async () => {
      service.employeeRepository.findById.mockResolvedValue(mockEmployee);
      service.securityStatusRepo.findByEmployeeId.mockResolvedValue(null);
      service.requestRepo.getTodayOvertime.mockResolvedValue(null);
      service.attendanceRepo.findOne.mockResolvedValue({ 
        id: 100, 
        checkInTime: new Date(), 
        checkOutTime: new Date() // Đã check-out
      });

      await expect(service.checkOut(mockUserId, mockFiles, mockLocation)).rejects.toThrow(BadRequestException);
      await expect(service.checkOut(mockUserId, mockFiles, mockLocation)).rejects.toThrow(AppMessages.Errors.Attendance.ALREADY_CHECKED_OUT);
    });

    it('7. Check-out thành công và trả về dữ liệu đúng', async () => {
      service.employeeRepository.findById.mockResolvedValue(mockEmployee);
      service.securityStatusRepo.findByEmployeeId.mockResolvedValue(null);
      service.requestRepo.getTodayOvertime.mockResolvedValue(null);
      
      const checkInRecord = { 
        id: 100, 
        checkInTime: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 tiếng trước
        shiftScheduleId: 1,
        shiftSchedule: { shift: { id: 1, startTime: '08:00', endTime: '17:00' } }
      };
      
      service.attendanceRepo.findOne.mockResolvedValue(checkInRecord);
      service.securityRepo.findOneConfig.mockResolvedValue({ applyTo: 'NONE' });
      service.faceConfigRepo.findOneConfig.mockResolvedValue({});
      service.shiftRepo.findTodayShiftByEmpId.mockResolvedValue([{ shift: { id: 1, startTime: '08:00', endTime: '17:00' } }]);
      service.attendanceRepo.update.mockResolvedValue({ ...checkInRecord, checkOutTime: new Date() });

      const result = await service.checkOut(mockUserId, mockFiles, mockLocation);

      expect(service._validateFace).toHaveBeenCalled();
      expect(service.attendanceRepo.update).toHaveBeenCalled();
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('checkOutTime');
      expect(result).toHaveProperty('earlyLeaveMinutes');
    });
  });
});
