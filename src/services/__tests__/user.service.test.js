import 'reflect-metadata';
import { ActionLogsService } from '../action-logs.service.js';
import {
  BadRequestException,
  NotFoundException,
} from '../../common/exceptions/index.js';

jest.mock('../../common/utils/user-agent.util.js', () => ({
  parseUserAgent: jest.fn((ua) => ua),
}));

jest.mock('../../common/utils/excel.util.js', () => ({
  ExcelUtil: {
    export: jest.fn().mockResolvedValue(Buffer.from('mock-excel')),
  },
}));

describe('ActionLogsService', () => {
  let actionLogsService;
  let mockActionLogsRepository;

  beforeEach(() => {
    jest.clearAllMocks();

    mockActionLogsRepository = {
      create: jest.fn(),
      findAll: jest.fn(),
      findById: jest.fn(),
    };

    actionLogsService = new ActionLogsService(mockActionLogsRepository);
  });

  describe('log', () => {
    it('should call repository.create with correct data', async () => {
      const data = {
        userId: 1,
        actionType: 'UPDATE',
        targetTable: 'users',
        targetRecordId: 10,
        description: 'Test log',
        requestIp: '127.0.0.1',
        userAgent: 'MockAgent',
      };

      await actionLogsService.log(data);

      expect(mockActionLogsRepository.create).toHaveBeenCalledWith({
        userId: 1,
        actionType: 'UPDATE',
        targetTable: 'users',
        targetRecordId: 10,
        beforeData: null,
        afterData: null,
        changedFields: null,
        description: 'Test log',
        requestIp: '127.0.0.1',
        userAgent: 'MockAgent',
      });
    });

    it('should handle missing userId in log', async () => {
      await actionLogsService.log({ actionType: 'LOGIN' });
      expect(mockActionLogsRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: null }),
      );
    });
  });

  describe('validateDateRange', () => {
    it('should not throw for valid inputs', () => {
      const dto = {
        fromDate: '01/01/2023',
        toDate: '02/01/2023',
        status: 'SUCCESS',
        sortOrder: 'ASC',
        page: 1,
        limit: 10,
      };

      expect(() => actionLogsService.validateDateRange(dto)).not.toThrow();
    });

    it('should handle Date objects in fromDate/toDate', () => {
      const dto = {
        fromDate: new Date('2023-01-01'),
        toDate: new Date('2023-01-02'),
      };
      expect(() => actionLogsService.validateDateRange(dto)).not.toThrow();
    });

    it('should throw for invalid fromDate format', () => {
      expect(() =>
        actionLogsService.validateDateRange({ fromDate: 'invalid' }),
      ).toThrow(BadRequestException);
    });

    it('should throw for fromDate in future', () => {
      expect(() =>
        actionLogsService.validateDateRange({ fromDate: '01/01/2099' }),
      ).toThrow(BadRequestException);
    });

    it('should throw for invalid toDate format', () => {
      expect(() =>
        actionLogsService.validateDateRange({ toDate: 'invalid' }),
      ).toThrow(BadRequestException);
    });

    it('should throw for toDate in future', () => {
      expect(() =>
        actionLogsService.validateDateRange({ toDate: '01/01/2099' }),
      ).toThrow(BadRequestException);
    });

    it('should throw if fromDate > toDate', () => {
      expect(() =>
        actionLogsService.validateDateRange({
          fromDate: '10/01/2023',
          toDate: '01/01/2023',
        }),
      ).toThrow(BadRequestException);
    });

    it('should throw for invalid status', () => {
      expect(() =>
        actionLogsService.validateDateRange({ status: 'INVALID' }),
      ).toThrow(BadRequestException);
    });

    it('should throw for invalid sortOrder', () => {
      expect(() =>
        actionLogsService.validateDateRange({ sortOrder: 'INVALID' }),
      ).toThrow(BadRequestException);
    });

    it('should throw for invalid page', () => {
      expect(() => actionLogsService.validateDateRange({ page: 0 })).toThrow(
        BadRequestException,
      );
      expect(() =>
        actionLogsService.validateDateRange({ page: 'abc' }),
      ).toThrow(BadRequestException);
    });

    it('should throw for invalid limit', () => {
      expect(() => actionLogsService.validateDateRange({ limit: 0 })).toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should call validate and repository.findAll', async () => {
      const dto = { page: 1, limit: 10 };
      const mockResult = [[{ id: 1, userAgent: 'test' }], 1];
      mockActionLogsRepository.findAll.mockResolvedValue(mockResult);

      const result = await actionLogsService.findAll(dto);

      expect(mockActionLogsRepository.findAll).toHaveBeenCalledWith(dto);
      expect(result.data).toHaveLength(1);
      expect(result.meta.totalItems).toBe(1);
    });
  });

  describe('findById', () => {
    it('should return item if found', async () => {
      const mockItem = { id: 1 };
      mockActionLogsRepository.findById.mockResolvedValue(mockItem);

      const result = await actionLogsService.findById(1);

      expect(result).toEqual(mockItem);
    });

    it('should throw NotFoundException if not found', async () => {
      mockActionLogsRepository.findById.mockResolvedValue(null);

      await expect(actionLogsService.findById(1)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('exportExcel', () => {
    it('should fetch all and call export', async () => {
      mockActionLogsRepository.findAll.mockResolvedValue([
        [
          {
            id: 1,
            user: { username: 'test', email: 'test@test.com' },
            actionType: 'UPDATE',
            status: 'SUCCESS',
            createdAt: new Date(),
          },
          {
            id: 2,
            user: null,
            actionType: 'LOGIN',
            status: 'FAILED',
            createdAt: null,
          },
        ],
        2,
      ]);

      const result = await actionLogsService.exportExcel();

      expect(mockActionLogsRepository.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10000,
      });
      expect(result).toBeDefined();
    });
  });
});
