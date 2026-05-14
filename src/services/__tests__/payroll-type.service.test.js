import 'reflect-metadata';
import { PayrollTypeService } from '../payroll-type.service.js';
import { PayrollTypeRepository } from '../../repositories/payroll-type.repository.js';

jest.mock('../../repositories/payroll-type.repository.js', () => ({
  PayrollTypeRepository: jest.fn(),
}));

describe('PayrollTypeService', () => {
  let service;
  let payrollTypeRepo;

  const expectRejectWithStatus = async (promise, statusCode) => {
    try {
      await promise;
      throw new Error('Expected promise to reject');
    } catch (err) {
      expect(err).toBeInstanceOf(Error);
      expect(err.statusCode).toBe(statusCode);
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();

    payrollTypeRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      findByCode: jest.fn(),
      findByKeyword: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };

    PayrollTypeRepository.mockImplementation(() => payrollTypeRepo);
    service = new PayrollTypeService();
  });

  it('throws NotFoundException when payroll type is missing', async () => {
    payrollTypeRepo.findById.mockResolvedValue(null);

    await expectRejectWithStatus(service.getById(1), 404);
  });

  it('throws ConflictException when creating with duplicated payrollTypeCode', async () => {
    payrollTypeRepo.findByCode.mockResolvedValue({ id: 1 });

    await expectRejectWithStatus(
      service.create({ payrollTypeCode: 'MONTHLY', keyword: 'MTH' }, 9),
      409,
    );

    expect(payrollTypeRepo.create).not.toHaveBeenCalled();
  });

  it('throws ConflictException when creating with duplicated keyword', async () => {
    payrollTypeRepo.findByCode.mockResolvedValue(null);
    payrollTypeRepo.findByKeyword.mockResolvedValue({ id: 2 });

    await expectRejectWithStatus(
      service.create({ payrollTypeCode: 'MONTHLY', keyword: 'MTH' }, 9),
      409,
    );
  });

  it('sets createdById when creating payroll type', async () => {
    payrollTypeRepo.findByCode.mockResolvedValue(null);
    payrollTypeRepo.findByKeyword.mockResolvedValue(null);
    payrollTypeRepo.create.mockResolvedValue({ id: 3 });

    await service.create({ payrollTypeCode: 'WEEKLY', keyword: 'WK' }, 20);

    expect(payrollTypeRepo.create).toHaveBeenCalledWith({
      payrollTypeCode: 'WEEKLY',
      keyword: 'WK',
      createdById: 20,
    });
  });

  it('throws ConflictException when updating to code used by another entity', async () => {
    payrollTypeRepo.findById.mockResolvedValue({ id: 10 });
    payrollTypeRepo.findByCode.mockResolvedValue({ id: 11 });

    await expectRejectWithStatus(
      service.update(10, { payrollTypeCode: 'MONTHLY' }),
      409,
    );
  });

  it('deletes payroll type when exists', async () => {
    payrollTypeRepo.findById.mockResolvedValue({ id: 4 });

    await service.delete(4);

    expect(payrollTypeRepo.delete).toHaveBeenCalledWith(4);
  });
});
