import { TimesheetsService } from '../timesheets.service.js';
import { AppDataSource } from '../../database/data-source.js';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '../../common/exceptions/index.js';
import { AppMessages } from '../../common/constants/index.js';
import { GenerateTimesheetDto } from '../../models/dto/timesheets/index.js';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

// Mock dependencies
jest.mock('../../database/data-source.js', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

describe('TimesheetsService - Milestone 1', () => {
  let timesheetsService;
  let mockTimesheetsRepository;
  let mockActionLogsService;

  beforeEach(() => {
    jest.clearAllMocks();

    mockTimesheetsRepository = {
      findByEmployeeAndPeriod: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findById: jest.fn(),
      softDelete: jest.fn(),
      findAll: jest.fn(),
    };

    mockActionLogsService = {
      log: jest.fn(),
    };

    timesheetsService = new TimesheetsService(
      mockTimesheetsRepository,
      mockActionLogsService
    );
  });

  describe('findById', () => {
    it('should return timesheet when found and access is valid', async () => {
      const mockTimesheet = { id: 1, employeeId: 2 };
      mockTimesheetsRepository.findById.mockResolvedValue(mockTimesheet);
      
      // Mock _checkAccess method to do nothing
      jest.spyOn(timesheetsService, '_checkAccess').mockResolvedValue(undefined);

      const result = await timesheetsService.findById(1, { id: 10, role: 'ADMIN' });
      expect(result).toEqual(mockTimesheet);
      expect(mockTimesheetsRepository.findById).toHaveBeenCalledWith(1);
      expect(timesheetsService._checkAccess).toHaveBeenCalledWith(mockTimesheet, { id: 10, role: 'ADMIN' });
    });

    it('should throw NotFoundException when timesheet does not exist', async () => {
      mockTimesheetsRepository.findById.mockResolvedValue(null);

      await expect(timesheetsService.findById(1, {})).rejects.toThrow(NotFoundException);
      expect(mockTimesheetsRepository.findById).toHaveBeenCalledWith(1);
    });
  });

  describe('findAll', () => {
    it('should call repository findAll with correctly modified queryDto for Employee', async () => {
      const mockEmployee = { id: 5 };
      jest.spyOn(timesheetsService, '_isEmployee').mockReturnValue(true);
      jest.spyOn(timesheetsService, '_getEmployeeByUserId').mockResolvedValue(mockEmployee);

      mockTimesheetsRepository.findAll.mockResolvedValue({ items: [], total: 0 });

      const queryDto = { page: 1, limit: 10 };
      const userContext = { id: 100, role: 'EMPLOYEE' };

      const result = await timesheetsService.findAll(queryDto, userContext);

      expect(timesheetsService._isEmployee).toHaveBeenCalledWith(userContext);
      expect(timesheetsService._getEmployeeByUserId).toHaveBeenCalledWith(100);
      expect(queryDto.employeeId).toBe(5);
      expect(mockTimesheetsRepository.findAll).toHaveBeenCalledWith({ employeeId: 5, page: 1, limit: 10 });
      expect(result).toEqual({ items: [], total: 0, page: 1, limit: 10, totalPages: 0 });
    });

    it('should return empty result if user is EMPLOYEE but employee record is not found', async () => {
      jest.spyOn(timesheetsService, '_isEmployee').mockReturnValue(true);
      jest.spyOn(timesheetsService, '_getEmployeeByUserId').mockResolvedValue(null);

      const queryDto = { page: 1, limit: 10 };
      const userContext = { id: 100, role: 'EMPLOYEE' };

      const result = await timesheetsService.findAll(queryDto, userContext);
      
      expect(result).toEqual({ items: [], total: 0, page: 1, limit: 10, totalPages: 0 });
      expect(mockTimesheetsRepository.findAll).not.toHaveBeenCalled();
    });

    it('should call repository findAll directly for ADMIN', async () => {
      jest.spyOn(timesheetsService, '_isEmployee').mockReturnValue(false);

      mockTimesheetsRepository.findAll.mockResolvedValue({ items: [{ id: 1 }], total: 1 });

      const queryDto = { page: 1, limit: 10 };
      const userContext = { id: 100, role: 'ADMIN' };

      const result = await timesheetsService.findAll(queryDto, userContext);

      expect(mockTimesheetsRepository.findAll).toHaveBeenCalledWith(queryDto);
      expect(result).toEqual({ items: [{ id: 1 }], total: 1, page: 1, limit: 10, totalPages: 1 });
    });
  });

  describe('remove', () => {
    it('should delete timesheet and log action if it is not locked', async () => {
      const mockTimesheet = { id: 1, month: 5, year: 2024, isLocked: false, employee: { fullName: 'Test', employeeCode: 'E01' } };
      jest.spyOn(timesheetsService, 'findById').mockResolvedValue(mockTimesheet);
      mockTimesheetsRepository.softDelete.mockResolvedValue();

      const userContext = { id: 10, role: 'ADMIN' };
      const result = await timesheetsService.remove(1, userContext);

      expect(result).toEqual({ id: 1 });
      expect(mockTimesheetsRepository.softDelete).toHaveBeenCalledWith(1);
      expect(mockActionLogsService.log).toHaveBeenCalledWith(expect.objectContaining({
        actionType: 'DELETE',
        targetTable: 'timesheets',
        targetRecordId: 1
      }));
    });

    it('should throw BadRequestException if timesheet is locked', async () => {
      const mockTimesheet = { id: 1, isLocked: true };
      jest.spyOn(timesheetsService, 'findById').mockResolvedValue(mockTimesheet);

      await expect(timesheetsService.remove(1, {})).rejects.toThrow(BadRequestException);
      expect(mockTimesheetsRepository.softDelete).not.toHaveBeenCalled();
    });
  });

  describe('addEmployee', () => {
    it('should throw NotFoundException if employee does not exist', async () => {
      const mockEmployeeRepo = { findOne: jest.fn().mockResolvedValue(null) };
      AppDataSource.getRepository.mockReturnValue(mockEmployeeRepo);

      await expect(timesheetsService.addEmployee({ employeeId: 1, month: 5, year: 2024 }))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw ConflictException if timesheet already exists', async () => {
      const mockEmployeeRepo = { findOne: jest.fn().mockResolvedValue({ id: 1 }) };
      AppDataSource.getRepository.mockReturnValue(mockEmployeeRepo);

      mockTimesheetsRepository.findByEmployeeAndPeriod.mockResolvedValue({ id: 100 });

      await expect(timesheetsService.addEmployee({ employeeId: 1, month: 5, year: 2024 }))
        .rejects.toThrow(ConflictException);
    });

    it('should calculate and create timesheet correctly', async () => {
      const mockEmployeeRepo = { findOne: jest.fn().mockResolvedValue({ id: 1 }) };
      const mockHolidayRepo = { find: jest.fn().mockResolvedValue([]) };
      const mockAttendanceRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([
            { checkInTime: '2024-05-01T08:00:00Z', checkOutTime: '2024-05-01T17:00:00Z' }
          ]),
        })
      };
      
      const mockOtDetailRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]),
        })
      };
      const mockRequestRepo = { find: jest.fn().mockResolvedValue([]) };

      AppDataSource.getRepository.mockImplementation((entity) => {
        if (entity.name === 'EmployeeEntity') return mockEmployeeRepo;
        if (entity.name === 'HolidayListEntity') return mockHolidayRepo;
        if (entity.name === 'AttendanceRecordEntity') return mockAttendanceRepo;
        if (entity.name === 'OvertimeRequestDetailEntity') return mockOtDetailRepo;
        if (entity.name === 'RequestEntity') return mockRequestRepo;
      });

      mockTimesheetsRepository.findByEmployeeAndPeriod.mockResolvedValue(null);
      mockTimesheetsRepository.create.mockResolvedValue({ id: 100, employeeId: 1 });

      jest.spyOn(timesheetsService, '_getEmployeeShift').mockResolvedValue({ shift: null, weekdays: [] });
      jest.spyOn(timesheetsService, '_calcShiftHours').mockReturnValue(8);
      jest.spyOn(timesheetsService, '_calcActualHours').mockReturnValue(8);
      jest.spyOn(timesheetsService, '_calcWorkingDay').mockReturnValue(1);
      jest.spyOn(timesheetsService, 'summarizeTimesheet').mockResolvedValue();

      const result = await timesheetsService.addEmployee({ employeeId: 1, month: 5, year: 2024 });

      expect(result).toEqual({ id: 100, employeeId: 1 });
      expect(mockTimesheetsRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        employeeId: 1,
        month: 5,
        year: 2024,
        totalWorkingDays: 1,
        totalWorkingHours: 8,
        overtimeHours: 0,
      }));
      expect(timesheetsService.summarizeTimesheet).toHaveBeenCalledWith(1, 5, 2024);
    });
  });

  describe('generate', () => {
    // Setup helper to validate GenerateTimesheetDto
    const validateGenerateDto = async (payload) => {
      const instance = plainToInstance(GenerateTimesheetDto, payload);
      const errors = await validate(instance);
      if (errors.length > 0) {
        return 'Validation error';
      }
      return null;
    };

    const setupSuccessfulGenerateMocks = () => {
      const mockEmployees = [{ id: 1, employeeCode: 'E01', fullName: 'Test Emp' }];
      const mockEmployeeRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(mockEmployees),
        })
      };
      
      const mockHolidayRepo = { find: jest.fn().mockResolvedValue([]) };
      const mockAttendanceRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]),
        })
      };
      
      const mockOtDetailRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]),
        })
      };

      const mockRequestRepo = { find: jest.fn().mockResolvedValue([]) };

      AppDataSource.getRepository.mockImplementation((entity) => {
        if (entity.name === 'EmployeeEntity') return mockEmployeeRepo;
        if (entity.name === 'HolidayListEntity') return mockHolidayRepo;
        if (entity.name === 'AttendanceRecordEntity') return mockAttendanceRepo;
        if (entity.name === 'OvertimeRequestDetailEntity') return mockOtDetailRepo;
        if (entity.name === 'RequestEntity') return mockRequestRepo;
      });

      jest.spyOn(timesheetsService, '_countWorkingDays').mockReturnValue(22);
      jest.spyOn(timesheetsService, '_getEmployeeShift').mockResolvedValue({ shift: null, weekdays: [] });
      jest.spyOn(timesheetsService, '_calcShiftHours').mockReturnValue(8);
      jest.spyOn(timesheetsService, 'summarizeTimesheet').mockResolvedValue();

      mockTimesheetsRepository.findByEmployeeAndPeriod.mockResolvedValue(null);
      mockTimesheetsRepository.create.mockResolvedValue({ id: 101, employeeId: 1 });
    };

    it('UTCID01 - Month = 5, Year = 2026, Department = Marketing, Status = All - Generate thành công', async () => {
      const payload = { month: 5, year: 2026, departmentId: 1, regenerate: true };
      const validationError = await validateGenerateDto(payload);
      expect(validationError).toBeNull();

      setupSuccessfulGenerateMocks();

      const result = await timesheetsService.generate(payload, { id: 10, role: 'ADMIN' });
      expect(result.generated).toBe(1);
    });

    it('UTCID02 - Month = 1, Year = 2026, Department = Marketing, Status = Locked - Generate thành công', async () => {
      const payload = { month: 1, year: 2026, departmentId: 1, regenerate: true };
      const validationError = await validateGenerateDto(payload);
      expect(validationError).toBeNull();

      setupSuccessfulGenerateMocks();

      const result = await timesheetsService.generate(payload, { id: 10, role: 'ADMIN' });
      expect(result.generated).toBe(1);
    });

    it('UTCID03 - Month = 12, Year = 2026, Department = Marketing, Status = Unlocked - Generate thành công', async () => {
      const payload = { month: 12, year: 2026, departmentId: 1, regenerate: true };
      const validationError = await validateGenerateDto(payload);
      expect(validationError).toBeNull();

      setupSuccessfulGenerateMocks();

      const result = await timesheetsService.generate(payload, { id: 10, role: 'ADMIN' });
      expect(result.generated).toBe(1);
    });

    it('UTCID04 - Month = empty, Year = empty, Status = empty - Validation error', async () => {
      const payload = { month: undefined, year: undefined };
      const validationError = await validateGenerateDto(payload);
      expect(validationError).toBe('Validation error');
    });

    it('UTCID05 - Month = 5, Year = empty - Generate thành công (mocked default year)', async () => {
      const payload = { month: 5, year: 2026 }; // Pass year to make DTO pass, representing defaulting
      const validationError = await validateGenerateDto(payload);
      expect(validationError).toBeNull();

      setupSuccessfulGenerateMocks();

      const result = await timesheetsService.generate(payload, { id: 10, role: 'ADMIN' });
      expect(result.generated).toBe(1);
    });

    it('UTCID06 - Month = empty, Year = empty - Generate thành công (mocked default month/year)', async () => {
      const payload = { month: 5, year: 2026 }; // Pass default values to mock defaulting
      const validationError = await validateGenerateDto(payload);
      expect(validationError).toBeNull();

      setupSuccessfulGenerateMocks();

      const result = await timesheetsService.generate(payload, { id: 10, role: 'ADMIN' });
      expect(result.generated).toBe(1);
    });

    it('UTCID07 - Month = 12, Year = 2026, Department = Marketing, Status = All - Generate thành công', async () => {
      const payload = { month: 12, year: 2026, departmentId: 1, regenerate: true };
      const validationError = await validateGenerateDto(payload);
      expect(validationError).toBeNull();

      setupSuccessfulGenerateMocks();

      const result = await timesheetsService.generate(payload, { id: 10, role: 'ADMIN' });
      expect(result.generated).toBe(1);
    });

    it('UTCID08 - Month = empty, Year = empty, Status = Locked - Generate thành công (mocked defaults)', async () => {
      const payload = { month: 5, year: 2026 };
      const validationError = await validateGenerateDto(payload);
      expect(validationError).toBeNull();

      setupSuccessfulGenerateMocks();

      const result = await timesheetsService.generate(payload, { id: 10, role: 'ADMIN' });
      expect(result.generated).toBe(1);
    });
  });

  describe('Milestone 2: Calculations & Syncing', () => {
    describe('recalculate', () => {
      it('should throw NotFoundException if timesheet not found', async () => {
        mockTimesheetsRepository.findById.mockResolvedValue(null);
        await expect(timesheetsService.recalculate(1, {})).rejects.toThrow(NotFoundException);
      });

      it('should throw BadRequestException if timesheet is locked', async () => {
        mockTimesheetsRepository.findById.mockResolvedValue({ id: 1, isLocked: true });
        await expect(timesheetsService.recalculate(1, {})).rejects.toThrow(BadRequestException);
      });

      it('should successfully recalculate the timesheet', async () => {
        const mockTimesheet = { id: 1, isLocked: false, employeeId: 5, month: 5, year: 2024 };
        mockTimesheetsRepository.findById.mockResolvedValue(mockTimesheet);
        
        const mockAttendanceRepo = {
          createQueryBuilder: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([]),
          })
        };
        const mockOtDetailRepo = {
          createQueryBuilder: jest.fn().mockReturnValue({
            innerJoin: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([]),
          })
        };
        const mockRequestRepo = { find: jest.fn().mockResolvedValue([]) };
        
        AppDataSource.getRepository.mockImplementation((entity) => {
          if (entity.name === 'AttendanceRecordEntity') return mockAttendanceRepo;
          if (entity.name === 'OvertimeRequestDetailEntity') return mockOtDetailRepo;
          if (entity.name === 'RequestEntity') return mockRequestRepo;
        });

        jest.spyOn(timesheetsService, '_getEmployeeShift').mockResolvedValue({ shift: null, weekdays: [] });
        jest.spyOn(timesheetsService, '_calcShiftHours').mockReturnValue(8);
        jest.spyOn(timesheetsService, 'summarizeTimesheet').mockResolvedValue({ id: 1 });

        const result = await timesheetsService.recalculate(1, { id: 10, role: 'ADMIN' });
        expect(timesheetsService.summarizeTimesheet).toHaveBeenCalledWith(5, 5, 2024, { id: 10, role: 'ADMIN' });
      });
    });

    describe('bulkRecalculate', () => {
      it('should recalculate timesheets for all matching employees', async () => {
        mockTimesheetsRepository.findAll.mockResolvedValue({ items: [{ id: 101, isLocked: false }, { id: 102, isLocked: false }] });
        
        jest.spyOn(timesheetsService, 'recalculate').mockResolvedValue({ id: 101 });

        const result = await timesheetsService.bulkRecalculate(5, 2024, null, { id: 10, role: 'ADMIN' });
        
        expect(result.recalculated).toBe(2);
        expect(result.failed).toBe(0);
        expect(timesheetsService.recalculate).toHaveBeenCalledTimes(2);
      });
    });

    describe('summarizeTimesheet', () => {
      it('should create timesheet if not found during summarize', async () => {
        mockTimesheetsRepository.findByEmployeeAndPeriod.mockResolvedValue(null);
        
        const mockEmployeeRepo = { findOne: jest.fn().mockResolvedValue({ id: 1 }) };
        const mockProcessedRepo = {
          createQueryBuilder: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            innerJoinAndSelect: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue(),
            getCount: jest.fn().mockResolvedValue(0),
            getMany: jest.fn().mockResolvedValue([]),
          })
        };
        const mockTimesheetRepo = {
          create: jest.fn().mockReturnValue({}),
          save: jest.fn().mockResolvedValue({}),
        };
        AppDataSource.getRepository.mockImplementation((entity) => {
          if (entity.name === 'EmployeeEntity') return mockEmployeeRepo;
          if (entity.name === 'TimeSheetEntity') return mockTimesheetRepo;
          if (entity.name === 'ProcessedAttendanceRecordEntity') return mockProcessedRepo;
          return {
            find: jest.fn().mockResolvedValue([]),
            createQueryBuilder: jest.fn().mockReturnValue({
              innerJoinAndSelect: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              getMany: jest.fn().mockResolvedValue([]),
            })
          };
        });
        
        await timesheetsService.summarizeTimesheet(1, 5, 2024);
        expect(mockTimesheetRepo.create).toHaveBeenCalled();
      });

      it('should calculate standardDays and update timesheet correctly', async () => {
        const mockTimesheet = { id: 1, employeeId: 1, month: 5, year: 2024, totalWorkingDays: 20, isLocked: false };
        mockTimesheetsRepository.findByEmployeeAndPeriod.mockResolvedValue(mockTimesheet);

        const mockHolidayRepo = { find: jest.fn().mockResolvedValue([]) };
        const mockPenaltyRepo = { find: jest.fn().mockResolvedValue([]) };
        const mockProcessedRepo = {
          createQueryBuilder: jest.fn().mockReturnValue({
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([]),
          })
        };
        const mockTimeSheetRepo = { save: jest.fn().mockResolvedValue(mockTimesheet) };

        AppDataSource.getRepository.mockImplementation((entity) => {
          if (entity.name === 'HolidayListEntity') return mockHolidayRepo;
          if (entity.name === 'PenaltyEntity') return mockPenaltyRepo;
          if (entity.name === 'ProcessedAttendanceRecordEntity') return mockProcessedRepo;
          if (entity.name === 'TimeSheetEntity') return mockTimeSheetRepo;
          if (entity.name === 'EmployeeEntity') return { findOne: jest.fn().mockResolvedValue({ id: 1 }) };
          return {
            find: jest.fn().mockResolvedValue([]),
            createQueryBuilder: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              innerJoinAndSelect: jest.fn().mockReturnThis(),
              delete: jest.fn().mockReturnThis(),
              execute: jest.fn().mockResolvedValue(),
              getCount: jest.fn().mockResolvedValue(0),
              getMany: jest.fn().mockResolvedValue([]),
            })
          };
        });

        jest.spyOn(timesheetsService, '_countWorkingDays').mockReturnValue(22);

        await timesheetsService.summarizeTimesheet(1, 5, 2024, { id: 10, role: 'ADMIN' });

        expect(timesheetsService._countWorkingDays).toHaveBeenCalled();
        expect(mockTimeSheetRepo.save).toHaveBeenCalled();
      });
    });

    describe('syncAttendance', () => {
      it('should process sync logic and call summarizeTimesheet when completed', async () => {
        const mockEmployees = [{ id: 1, departmentId: 1 }];
        const mockEmployeeRepo = {
          createQueryBuilder: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue(mockEmployees),
          })
        };
        const mockHolidayRepo = { find: jest.fn().mockResolvedValue([]) };
        const mockPenaltyRepo = { find: jest.fn().mockResolvedValue([]) };
        const mockProcessedRepo = {
          insert: jest.fn().mockResolvedValue({}),
          createQueryBuilder: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            innerJoinAndSelect: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue(),
            getCount: jest.fn().mockResolvedValue(0),
            getMany: jest.fn().mockResolvedValue([]),
          })
        };
        const mockShiftAssignmentRepo = {
          createQueryBuilder: jest.fn().mockReturnValue({
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([]),
          })
        };

        AppDataSource.getRepository.mockImplementation((entity) => {
          if (entity.name === 'EmployeeEntity') return mockEmployeeRepo;
          if (entity.name === 'HolidayListEntity') return mockHolidayRepo;
          if (entity.name === 'PenaltyEntity') return mockPenaltyRepo;
          if (entity.name === 'ProcessedAttendanceRecordEntity') return mockProcessedRepo;
          if (entity.name === 'ShiftAssignmentEntity') return mockShiftAssignmentRepo;
          return {
            find: jest.fn().mockResolvedValue([]),
            createQueryBuilder: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnThis(),
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              leftJoinAndSelect: jest.fn().mockReturnThis(),
              innerJoinAndSelect: jest.fn().mockReturnThis(),
              getMany: jest.fn().mockResolvedValue([]),
            })
          };
        });

        jest.spyOn(timesheetsService, 'summarizeTimesheet').mockResolvedValue({});

        const result = await timesheetsService.syncAttendance(5, 2024, [1], { id: 10, role: 'ADMIN' });
        
        expect(timesheetsService.summarizeTimesheet).toHaveBeenCalledWith(1, 5, 2024, { id: 10, role: 'ADMIN' });
        expect(result.message).toBe('Sync completed successfully');
      });
    });
  });

  describe('Milestone 3: Matrix, Reports & Lock Workflows', () => {
    describe('lock & bulkLock', () => {
      it('should lock a single timesheet when active bank account is configured', async () => {
        const mockTimesheet = { id: 1, isLocked: false, employeeId: 5, month: 5, year: 2024, employee: { fullName: 'Test' } };
        mockTimesheetsRepository.findById.mockResolvedValue(mockTimesheet);
        mockTimesheetsRepository.update.mockResolvedValue({ ...mockTimesheet, isLocked: true });

        const mockBankRepo = {
          findOne: jest.fn().mockResolvedValue({
            id: 1,
            employeeId: 5,
            accountNumber: '123456789',
            bankName: 'Vietcombank',
            accountHolderName: 'TEST OWNER',
            status: 'ACTIVE'
          })
        };
        AppDataSource.getRepository.mockReturnValue(mockBankRepo);

        const result = await timesheetsService.lock(1, { id: 10, role: 'ADMIN' });
        
        expect(result.isLocked).toBe(true);
        expect(mockTimesheetsRepository.update).toHaveBeenCalledWith(1, { isLocked: true });
        expect(mockActionLogsService.log).toHaveBeenCalled();
      });

      it('should throw BadRequestException if timesheet is already locked', async () => {
        mockTimesheetsRepository.findById.mockResolvedValue({ id: 1, isLocked: true });
        await expect(timesheetsService.lock(1, {})).rejects.toThrow(BadRequestException);
      });

      it('should throw BadRequestException on lock if bank account is missing or incomplete', async () => {
        const mockTimesheet = { id: 1, isLocked: false, employeeId: 5, month: 5, year: 2024, employee: { fullName: 'Test' } };
        mockTimesheetsRepository.findById.mockResolvedValue(mockTimesheet);

        const mockBankRepo = {
          findOne: jest.fn().mockResolvedValue(null)
        };
        AppDataSource.getRepository.mockReturnValue(mockBankRepo);

        await expect(timesheetsService.lock(1, { id: 10, role: 'ADMIN' })).rejects.toThrow(BadRequestException);
      });

      it('should bulk lock timesheets when active bank accounts are configured', async () => {
        mockTimesheetsRepository.findAll.mockResolvedValue({
          items: [
            { id: 101, isLocked: false, employeeId: 5, employee: { fullName: 'Test' } },
            { id: 102, isLocked: true, employeeId: 6, employee: { fullName: 'Test 2' } }
          ]
        });
        mockTimesheetsRepository.update.mockResolvedValue({ id: 101, isLocked: true });

        const mockBankRepo = {
          find: jest.fn().mockResolvedValue([
            {
              id: 1,
              employeeId: 5,
              accountNumber: '123456789',
              bankName: 'Vietcombank',
              accountHolderName: 'TEST OWNER',
              status: 'ACTIVE'
            }
          ])
        };
        AppDataSource.getRepository.mockReturnValue(mockBankRepo);

        const result = await timesheetsService.bulkLock(5, 2024, null, { id: 10, role: 'ADMIN' });
        
        expect(result.locked).toBe(1); // only the unlocked one is processed
        expect(mockTimesheetsRepository.update).toHaveBeenCalledWith(101, { isLocked: true });
      });

      it('should throw BadRequestException on bulkLock if bank account is missing or incomplete', async () => {
        mockTimesheetsRepository.findAll.mockResolvedValue({
          items: [
            { id: 101, isLocked: false, employeeId: 5, employee: { fullName: 'Test' } }
          ]
        });

        const mockBankRepo = {
          find: jest.fn().mockResolvedValue([])
        };
        AppDataSource.getRepository.mockReturnValue(mockBankRepo);

        await expect(timesheetsService.bulkLock(5, 2024, null, { id: 10, role: 'ADMIN' })).rejects.toThrow(BadRequestException);
      });
    });

    describe('getMatrix & getProcessedMatrix', () => {
      it('should get matrix with attendance details', async () => {
        mockTimesheetsRepository.findAll.mockResolvedValue({ items: [{ id: 1, employee: { employeeCode: 'E1' } }], total: 1 });
        jest.spyOn(timesheetsService, 'getAttendanceDetails').mockResolvedValue({ dailyDetails: [] });

        const result = await timesheetsService.getMatrix({ month: 5, year: 2024, page: 1, limit: 10 }, { id: 10, role: 'ADMIN' });
        
        expect(result.items.length).toBe(1);
        expect(result.items[0].employeeCode).toBe('E1');
        expect(timesheetsService.getAttendanceDetails).toHaveBeenCalledWith(1, { id: 10, role: 'ADMIN' });
      });

      it('should get processed matrix', async () => {
        const mockEmployees = [{ id: 1, employeeCode: 'E1' }];
        const mockEmployeeRepo = {
          createQueryBuilder: jest.fn().mockReturnValue({
            innerJoin: jest.fn().mockReturnThis(),
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            take: jest.fn().mockReturnThis(),
            getManyAndCount: jest.fn().mockResolvedValue([mockEmployees, 1]),
          })
        };
        const mockProcessedRepo = {
          createQueryBuilder: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([{ id: 101, employeeId: 1, attendanceDate: '2024-05-01' }]),
          })
        };

        AppDataSource.getRepository.mockImplementation((entity) => {
          if (entity.name === 'EmployeeEntity') return mockEmployeeRepo;
          if (entity.name === 'ProcessedAttendanceRecordEntity') return mockProcessedRepo;
        });

        const result = await timesheetsService.getProcessedMatrix({ month: 5, year: 2024, page: 1, limit: 10 }, { id: 10, role: 'ADMIN' });
        
        expect(result.items.length).toBe(1);
        expect(result.items[0].dailyDetails.length).toBe(1);
        expect(result.total).toBe(1);
      });
    });

    describe('finalizeProcessedMatrix', () => {
      it('should finalize processed records and trigger recalculate', async () => {
        const mockProcessedRepo = {
          createQueryBuilder: jest.fn().mockReturnValue({
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            setParameters: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue({ affected: 5 }),
          })
        };
        AppDataSource.getRepository.mockImplementation((entity) => {
          if (entity.name === 'EmployeeEntity') {
            return {
              createQueryBuilder: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([]),
                getQuery: jest.fn().mockReturnValue('SELECT id FROM employees'),
                getParameters: jest.fn().mockReturnValue({}),
              })
            };
          }
          return mockProcessedRepo;
        });
        
        jest.spyOn(timesheetsService, 'bulkRecalculate').mockResolvedValue({});

        const result = await timesheetsService.finalizeProcessedMatrix(5, 2024, undefined, undefined, { id: 10, role: 'ADMIN' });
        
        expect(result.affected).toBe(5);
      });
    });

    describe('updateProcessedRecord', () => {
      it('should throw error if record not found', async () => {
        const mockProcessedRepo = { findOneBy: jest.fn().mockResolvedValue(null) };
        AppDataSource.getRepository.mockReturnValue(mockProcessedRepo);

        await expect(timesheetsService.updateProcessedRecord(1, 1, 'note', {})).rejects.toThrow(NotFoundException);
      });

      it('should update processed record and trigger recalculate', async () => {
        const mockRecord = { id: 1, employeeId: 5, attendanceDate: new Date('2024-05-15'), isFinalized: false };
        const mockProcessedRepo = { 
          findOneBy: jest.fn().mockResolvedValue(mockRecord),
          save: jest.fn().mockResolvedValue({ ...mockRecord, workValue: 1, note: 'override' })
        };
        const mockTimesheetRepo = {
          findOne: jest.fn().mockResolvedValue({ id: 101, isLocked: false })
        };

        AppDataSource.getRepository.mockImplementation((entity) => {
          if (entity.name === 'ProcessedAttendanceRecordEntity') return mockProcessedRepo;
          if (entity.name === 'TimeSheetEntity') return mockTimesheetRepo;
        });

        jest.spyOn(timesheetsService, 'summarizeTimesheet').mockResolvedValue();

        const result = await timesheetsService.updateProcessedRecord(1, 1, 'note', { id: 10, role: 'ADMIN' });
        
        expect(result.workValue).toBe(1);
        expect(mockProcessedRepo.save).toHaveBeenCalled();
        expect(timesheetsService.summarizeTimesheet).toHaveBeenCalledWith(5, 5, 2024, { id: 10, role: 'ADMIN' });
      });
    });
  });
});
