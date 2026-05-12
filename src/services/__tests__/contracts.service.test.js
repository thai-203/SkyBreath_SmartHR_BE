import 'reflect-metadata';
import { ContractsService } from '../contracts.service.js';
import { ContractsRepository } from '../../repositories/contracts.repository.js';
import { EmployeesRepository } from '../../repositories/employees.repository.js';
import { AppDataSource } from '../../database/data-source.js';

jest.mock('../../repositories/contracts.repository.js', () => ({
  ContractsRepository: jest.fn(),
}));

jest.mock('../../repositories/employees.repository.js', () => ({
  EmployeesRepository: jest.fn(),
}));

jest.mock('../../database/data-source.js', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

describe('ContractsService - Create Contract (Unit Tests)', () => {
  let service;
  let contractsRepo;
  let employeesRepo;

  const SAMPLE = {
    employeeId: 5,
    contractNumber: '00007',
    departmentId: 1,
    positionId: 2,
    jobGradeId: 12,
    contractType: 'permanent',
    signedDate: '2026-03-08',
    startDate: '2026-03-08',
    endDate: '',
    workingHours: 40,
    baseSalary: 4500000,
    performanceSalary: 900000,
    lunchAllowance: 0,
    fuelAllowance: 0,
    phoneAllowance: 0,
    otherAllowance: 0,
  };

  const expectRejectWith = async (promise, statusCode, message) => {
    try {
      await promise;
      throw new Error('Expected promise to reject');
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect(err.statusCode).toBe(statusCode);
      expect(err.message).toBe(message);
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();

    contractsRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByEmployeeId: jest.fn(),
      findByContractNumber: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };

    employeesRepo = {
      findById: jest.fn(),
    };

    ContractsRepository.mockImplementation(() => contractsRepo);
    EmployeesRepository.mockImplementation(() => employeesRepo);

    service = new ContractsService();
  });

  it('Tạo hợp đồng thành công khi tất cả dữ liệu hợp lệ', async () => {
    const input = { ...SAMPLE };
    // Input: dữ liệu hợp lệ SAMPLE
    // Mock: nhân viên tồn tại; không có hợp đồng active; số hợp đồng chưa tồn tại; job grade trong khoảng
    // Expected result: tạo thành công
    // Expected message: "Tạo hợp đồng thành công"

    // Mocks
    employeesRepo.findById.mockResolvedValue({ id: input.employeeId });
    contractsRepo.findByEmployeeId.mockResolvedValue([]);
    contractsRepo.findByContractNumber.mockResolvedValue(null);
    AppDataSource.getRepository
      .mockReturnValueOnce({
        findOne: jest.fn().mockResolvedValue({ id: input.departmentId }),
      })
      .mockReturnValueOnce({
        findOne: jest.fn().mockResolvedValue({ id: input.positionId }),
      })
      .mockReturnValueOnce({
        findOne: jest
          .fn()
          .mockResolvedValue({
            id: input.jobGradeId,
            minSalary: 0,
            maxSalary: 5000000,
          }),
      });

    contractsRepo.create.mockResolvedValue({ id: 100, ...input });

    const result = await service.create(input);

    expect(contractsRepo.create).toHaveBeenCalled();
    if (result && typeof result === 'object' && 'message' in result) {
      expect(result.message).toBe('Tạo hợp đồng thành công');
    } else {
      // If service returns created entity directly, at least ensure the created entity is returned
      expect(result).toEqual({ id: 100, ...input });
    }
  });

  it('Không cho tạo hợp đồng nếu nhân viên đã có hợp đồng đang hoạt động', async () => {
    const input = { ...SAMPLE };
    // Input: SAMPLE
    // Mock: nhân viên tồn tại; có hợp đồng ACTIVE
    // Expected result: thất bại
    // Expected message: "Nhân viên đã có hợp đồng đang hoạt động"

    employeesRepo.findById.mockResolvedValue({ id: input.employeeId });
    contractsRepo.findByEmployeeId.mockResolvedValue([
      { id: 1, contractStatus: 'ACTIVE', isDeleted: false },
    ]);

    await expectRejectWith(
      service.create(input),
      409,
      'Nhân viên đã có hợp đồng đang hoạt động',
    );
    expect(contractsRepo.create).not.toHaveBeenCalled();
  });

  it('Không cho tạo nếu contractNumber đã tồn tại trong database', async () => {
    const input = { ...SAMPLE };
    // Input: SAMPLE
    // Mock: nhân viên tồn tại; không có hợp đồng active; contractNumber tồn tại
    // Expected result: thất bại
    // Expected message: "Số hợp đồng này đã tồn tại."

    employeesRepo.findById.mockResolvedValue({ id: input.employeeId });
    contractsRepo.findByEmployeeId.mockResolvedValue([]);
    contractsRepo.findByContractNumber.mockResolvedValue({
      id: 2,
      contractNumber: input.contractNumber,
    });

    await expectRejectWith(
      service.create(input),
      409,
      'Số hợp đồng này đã tồn tại.',
    );
    expect(contractsRepo.create).not.toHaveBeenCalled();
  });

  it('Báo lỗi validation khi thiếu departmentId', async () => {
    const input = { ...SAMPLE };
    delete input.departmentId;
    // Input: missing departmentId
    // Mock: nhân viên tồn tại; không có hợp đồng active
    // Expected result: thất bại
    // Expected message: "Validation failed"

    employeesRepo.findById.mockResolvedValue({ id: input.employeeId });
    contractsRepo.findByEmployeeId.mockResolvedValue([]);

    await expectRejectWith(service.create(input), 400, 'Validation failed');
    expect(contractsRepo.create).not.toHaveBeenCalled();
  });

  it('Báo lỗi validation khi thiếu positionId', async () => {
    const input = { ...SAMPLE };
    delete input.positionId;
    // Input: missing positionId
    // Expected message: "Validation failed"

    employeesRepo.findById.mockResolvedValue({ id: input.employeeId });
    contractsRepo.findByEmployeeId.mockResolvedValue([]);

    await expectRejectWith(service.create(input), 400, 'Validation failed');
    expect(contractsRepo.create).not.toHaveBeenCalled();
  });

  it('Báo lỗi validation khi thiếu jobGradeId', async () => {
    const input = { ...SAMPLE };
    delete input.jobGradeId;
    // Input: missing jobGradeId
    // Expected message: "Validation failed"

    employeesRepo.findById.mockResolvedValue({ id: input.employeeId });
    contractsRepo.findByEmployeeId.mockResolvedValue([]);

    await expectRejectWith(service.create(input), 400, 'Validation failed');
    expect(contractsRepo.create).not.toHaveBeenCalled();
  });

  it('Báo lỗi khi signedDate lớn hơn startDate', async () => {
    const input = {
      ...SAMPLE,
      signedDate: '2026-03-10',
      startDate: '2026-03-08',
    };
    // Expected message: "Ngày ký hợp đồng không thể sau ngày bắt đầu"

    employeesRepo.findById.mockResolvedValue({ id: input.employeeId });
    contractsRepo.findByEmployeeId.mockResolvedValue([]);
    AppDataSource.getRepository.mockReturnValue({
      findOne: jest
        .fn()
        .mockResolvedValue({
          id: input.jobGradeId,
          minSalary: 0,
          maxSalary: 5000000,
        }),
    });

    await expectRejectWith(
      service.create(input),
      400,
      'Ngày ký hợp đồng không thể sau ngày bắt đầu',
    );
  });

  it('Báo lỗi khi endDate nhỏ hơn startDate', async () => {
    const input = { ...SAMPLE, startDate: '2026-03-08', endDate: '2026-03-07' };
    // Expected message: "Ngày kết thúc phải sau ngày bắt đầu"

    employeesRepo.findById.mockResolvedValue({ id: input.employeeId });
    contractsRepo.findByEmployeeId.mockResolvedValue([]);
    AppDataSource.getRepository.mockReturnValue({
      findOne: jest
        .fn()
        .mockResolvedValue({
          id: input.jobGradeId,
          minSalary: 0,
          maxSalary: 5000000,
        }),
    });

    await expectRejectWith(
      service.create(input),
      400,
      'Ngày kết thúc phải sau ngày bắt đầu',
    );
  });

  it('Báo lỗi khi baseSalary vượt quá giới hạn cho phép', async () => {
    const input = { ...SAMPLE, baseSalary: 6000000 };
    // Expected message: "Lương cơ bản phải nằm trong khoảng 0 - 5000000"

    employeesRepo.findById.mockResolvedValue({ id: input.employeeId });
    contractsRepo.findByEmployeeId.mockResolvedValue([]);
    AppDataSource.getRepository.mockReturnValue({
      findOne: jest
        .fn()
        .mockResolvedValue({
          id: input.jobGradeId,
          minSalary: 0,
          maxSalary: 5000000,
        }),
    });

    await expectRejectWith(
      service.create(input),
      400,
      'Lương cơ bản phải nằm trong khoảng 0 - 5000000',
    );
  });

  it('Báo lỗi khi performanceSalary vượt quá 50% lương cơ bản', async () => {
    const input = { ...SAMPLE, baseSalary: 1000000, performanceSalary: 600000 };
    // Expected message: "Lương KPI không được vượt quá 50% lương cơ bản"

    employeesRepo.findById.mockResolvedValue({ id: input.employeeId });
    contractsRepo.findByEmployeeId.mockResolvedValue([]);
    AppDataSource.getRepository.mockReturnValue({
      findOne: jest
        .fn()
        .mockResolvedValue({
          id: input.jobGradeId,
          minSalary: 0,
          maxSalary: 5000000,
        }),
    });

    await expectRejectWith(
      service.create(input),
      400,
      'Lương KPI không được vượt quá 50% lương cơ bản',
    );
  });

  it('Báo lỗi khi lunchAllowance vượt định mức', async () => {
    const input = { ...SAMPLE, lunchAllowance: 1000001 };
    // Expected message: "Giá trị lunchAllowance vượt định mức 1000000"

    employeesRepo.findById.mockResolvedValue({ id: input.employeeId });
    contractsRepo.findByEmployeeId.mockResolvedValue([]);
    AppDataSource.getRepository.mockReturnValue({
      findOne: jest
        .fn()
        .mockResolvedValue({
          id: input.jobGradeId,
          minSalary: 0,
          maxSalary: 5000000,
        }),
    });

    await expectRejectWith(
      service.create(input),
      400,
      'Giá trị lunchAllowance vượt định mức 1000000',
    );
  });

  it('Báo lỗi khi fuelAllowance vượt định mức', async () => {
    const input = { ...SAMPLE, fuelAllowance: 2000001 };
    // Expected message: "Giá trị fuelAllowance vượt định mức 2000000"

    employeesRepo.findById.mockResolvedValue({ id: input.employeeId });
    contractsRepo.findByEmployeeId.mockResolvedValue([]);
    AppDataSource.getRepository.mockReturnValue({
      findOne: jest
        .fn()
        .mockResolvedValue({
          id: input.jobGradeId,
          minSalary: 0,
          maxSalary: 5000000,
        }),
    });

    await expectRejectWith(
      service.create(input),
      400,
      'Giá trị fuelAllowance vượt định mức 2000000',
    );
  });

  it('Báo lỗi khi phoneAllowance vượt định mức', async () => {
    const input = { ...SAMPLE, phoneAllowance: 1000001 };
    // Expected message: "Giá trị phoneAllowance vượt định mức 1000000"

    employeesRepo.findById.mockResolvedValue({ id: input.employeeId });
    contractsRepo.findByEmployeeId.mockResolvedValue([]);
    AppDataSource.getRepository.mockReturnValue({
      findOne: jest
        .fn()
        .mockResolvedValue({
          id: input.jobGradeId,
          minSalary: 0,
          maxSalary: 5000000,
        }),
    });

    await expectRejectWith(
      service.create(input),
      400,
      'Giá trị phoneAllowance vượt định mức 1000000',
    );
  });

  it('Báo lỗi khi otherAllowance vượt định mức', async () => {
    const input = { ...SAMPLE, otherAllowance: 5000001 };
    // Expected message: "Giá trị otherAllowance vượt định mức 5000000"

    employeesRepo.findById.mockResolvedValue({ id: input.employeeId });
    contractsRepo.findByEmployeeId.mockResolvedValue([]);
    AppDataSource.getRepository.mockReturnValue({
      findOne: jest
        .fn()
        .mockResolvedValue({
          id: input.jobGradeId,
          minSalary: 0,
          maxSalary: 5000000,
        }),
    });

    await expectRejectWith(
      service.create(input),
      400,
      'Giá trị otherAllowance vượt định mức 5000000',
    );
  });

  it('Kiểm tra upload attachment: có file', async () => {
    const input = {
      ...SAMPLE,
      attachments: [{ filename: 'attach.pdf', size: 1000 }],
    };
    // Input: SAMPLE + attachments
    // Expected result: tạo thành công

    employeesRepo.findById.mockResolvedValue({ id: input.employeeId });
    contractsRepo.findByEmployeeId.mockResolvedValue([]);
    contractsRepo.findByContractNumber.mockResolvedValue(null);
    AppDataSource.getRepository
      .mockReturnValueOnce({
        findOne: jest.fn().mockResolvedValue({ id: input.departmentId }),
      })
      .mockReturnValueOnce({
        findOne: jest.fn().mockResolvedValue({ id: input.positionId }),
      })
      .mockReturnValueOnce({
        findOne: jest
          .fn()
          .mockResolvedValue({
            id: input.jobGradeId,
            minSalary: 0,
            maxSalary: 5000000,
          }),
      });

    contractsRepo.create.mockResolvedValue({ id: 200, ...input });

    const result = await service.create(input);
    expect(contractsRepo.create).toHaveBeenCalled();
    if (result && typeof result === 'object' && 'message' in result) {
      expect(result.message).toBe('Tạo hợp đồng thành công');
    }
  });

  it('Kiểm tra upload attachment: không có file', async () => {
    const input = { ...SAMPLE };
    // Input: SAMPLE (không có attachments)
    // Expected result: tạo thành công

    employeesRepo.findById.mockResolvedValue({ id: input.employeeId });
    contractsRepo.findByEmployeeId.mockResolvedValue([]);
    contractsRepo.findByContractNumber.mockResolvedValue(null);
    AppDataSource.getRepository
      .mockReturnValueOnce({
        findOne: jest.fn().mockResolvedValue({ id: input.departmentId }),
      })
      .mockReturnValueOnce({
        findOne: jest.fn().mockResolvedValue({ id: input.positionId }),
      })
      .mockReturnValueOnce({
        findOne: jest
          .fn()
          .mockResolvedValue({
            id: input.jobGradeId,
            minSalary: 0,
            maxSalary: 5000000,
          }),
      });

    contractsRepo.create.mockResolvedValue({ id: 201, ...input });

    const result = await service.create(input);
    expect(contractsRepo.create).toHaveBeenCalled();
    if (result && typeof result === 'object' && 'message' in result) {
      expect(result.message).toBe('Tạo hợp đồng thành công');
    }
  });
});
