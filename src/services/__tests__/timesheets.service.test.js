import { TimesheetsService } from '../timesheets.service.js';
import { AppDataSource } from '../../database/data-source.js';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '../../common/exceptions/index.js';
import { AppMessages } from '../../common/constants/index.js';

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
      
      AppDataSource.getRepository.mockImplementation((entity) => {
        if (entity.name === 'EmployeeEntity') return mockEmployeeRepo;
        if (entity.name === 'HolidayListEntity') return mockHolidayRepo;
        if (entity.name === 'AttendanceRecordEntity') return mockAttendanceRepo;
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
    it('should return 0 generated if no employees found', async () => {
      const mockEmployeeRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue([]),
        })
      };
      AppDataSource.getRepository.mockReturnValue(mockEmployeeRepo);

      const result = await timesheetsService.generate({ month: 5, year: 2024 }, { id: 10, role: 'ADMIN' });
      expect(result).toEqual({ generated: 0, timesheets: [] });
    });

    it('should successfully generate timesheets for employees', async () => {
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

      const result = await timesheetsService.generate({ month: 5, year: 2024 }, { id: 10, role: 'ADMIN' });

      expect(result.generated).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.updated).toBe(0);
      expect(mockTimesheetsRepository.create).toHaveBeenCalled();
      expect(timesheetsService.summarizeTimesheet).toHaveBeenCalledWith(1, 5, 2024, { id: 10, role: 'ADMIN' });
    });

    it('should update existing timesheet if not locked and not regenerating', async () => {
      const mockEmployees = [{ id: 1 }];
      const mockEmployeeRepo = {
        createQueryBuilder: jest.fn().mockReturnValue({
          leftJoinAndSelect: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          andWhere: jest.fn().mockReturnThis(),
          getMany: jest.fn().mockResolvedValue(mockEmployees),
        })
      };
      AppDataSource.getRepository.mockImplementation((entity) => {
        if (entity.name === 'EmployeeEntity') return mockEmployeeRepo;
        return { 
          find: jest.fn().mockResolvedValue([]),
          createQueryBuilder: jest.fn().mockReturnValue({
            leftJoinAndSelect: jest.fn().mockReturnThis(),
            innerJoin: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([]),
          })
        };
      });

      jest.spyOn(timesheetsService, '_countWorkingDays').mockReturnValue(22);
      jest.spyOn(timesheetsService, '_getEmployeeShift').mockResolvedValue({ shift: null, weekdays: [] });
      jest.spyOn(timesheetsService, '_calcShiftHours').mockReturnValue(8);
      jest.spyOn(timesheetsService, 'summarizeTimesheet').mockResolvedValue();

      mockTimesheetsRepository.findByEmployeeAndPeriod.mockResolvedValue({ id: 101, isLocked: false });
      mockTimesheetsRepository.update.mockResolvedValue({ id: 101, employeeId: 1 });

      const result = await timesheetsService.generate({ month: 5, year: 2024 }, { id: 10, role: 'ADMIN' });

      expect(result.updated).toBe(1);
      expect(mockTimesheetsRepository.update).toHaveBeenCalled();
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
        jest.spyOn(timesheetsService, 'summarizeTimesheet').mockResolvedValue();

        const result = await timesheetsService.recalculate(1, { id: 10, role: 'ADMIN' });
        
        expect(mockTimesheetsRepository.update).toHaveBeenCalled();
        expect(timesheetsService.summarizeTimesheet).toHaveBeenCalledWith(5, 5, 2024, { id: 10, role: 'ADMIN' });
      });
    });

    describe('bulkRecalculate', () => {
      it('should recalculate timesheets for all matching employees', async () => {
        mockTimesheetsRepository.findAll.mockResolvedValue({ items: [{ id: 101, isLocked: false }, { id: 102, isLocked: false }] });
        
        jest.spyOn(timesheetsService, 'recalculate').mockResolvedValue({ id: 101 });

        const result = await timesheetsService.bulkRecalculate(5, 2024, null, { id: 10, role: 'ADMIN' });
        
        expect(result.success).toBe(2);
        expect(result.failed).toBe(0);
        expect(timesheetsService.recalculate).toHaveBeenCalledTimes(2);
      });
    });

    describe('summarizeTimesheet', () => {
      it('should throw NotFoundException if timesheet not found during summarize', async () => {
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
        AppDataSource.getRepository.mockImplementation((entity) => {
          if (entity.name === 'EmployeeEntity') return mockEmployeeRepo;
          if (entity.name === 'TimeSheetEntity') return mockTimesheetRepo;
          if (entity.name === 'ProcessedAttendanceRecordEntity') return mockProcessedRepo;
          return { find: jest.fn().mockResolvedValue([]) };
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
        expect(mockTimesheetsRepository.update).toHaveBeenCalled();
      });
    });

    describe('syncAttendance', () => {
      it('should process sync logic and call generate when completed', async () => {
        const mockEmployees = [{ id: 1 }];
        const mockEmployeeRepo = {
          createQueryBuilder: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue(mockEmployees),
          })
        };
        const mockHolidayRepo = { find: jest.fn().mockResolvedValue([]) };
        
        AppDataSource.getRepository.mockImplementation((entity) => {
          if (entity.name === 'EmployeeEntity') return mockEmployeeRepo;
          if (entity.name === 'HolidayListEntity') return mockHolidayRepo;
          // default mock with querybuilder for records
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

        // Mock AppDataSource.transaction
        AppDataSource.transaction = jest.fn().mockImplementation(async (cb) => {
          const manager = {
            delete: jest.fn(),
            save: jest.fn(),
            insert: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue({
               where: jest.fn().mockReturnThis(),
               andWhere: jest.fn().mockReturnThis(),
               getMany: jest.fn().mockResolvedValue([]),
            })
          };
          return cb(manager);
        });

        jest.spyOn(timesheetsService, 'generate').mockResolvedValue({ generated: 1, timesheets: [] });

        const result = await timesheetsService.syncAttendance(5, 2024, [1], { id: 10, role: 'ADMIN' });
        
        expect(AppDataSource.transaction).toHaveBeenCalled();
        expect(timesheetsService.generate).toHaveBeenCalledWith({ month: 5, year: 2024, employeeIds: [1], regenerate: true }, { id: 10, role: 'ADMIN' });
        expect(result.syncedEmployees).toBe(1);
      });
    });
  });
});
