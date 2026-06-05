import 'reflect-metadata';
import { PenaltiesService } from '../penalties.service.js';
import { PenaltiesRepository } from '../../repositories/penalties.repository.js';
import { NotFoundException, ConflictException, BadRequestException } from '../../common/exceptions/index.js';

jest.mock('../../repositories/penalties.repository.js');

describe('PenaltiesService Tests', () => {
  let service;
  let penaltiesRepo;

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

    penaltiesRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findOverlapping: jest.fn(),
    };
    PenaltiesRepository.mockImplementation(() => penaltiesRepo);

    service = new PenaltiesService();
  });

  describe('Create Penalty', () => {
    // 5 test cases matching Excel

    it('1. successfully creates penalty rule with valid data', async () => {
      penaltiesRepo.findOverlapping.mockResolvedValue([]);
      penaltiesRepo.create.mockResolvedValue({ id: 1, violationType: 'LATE' });

      const result = await service.create({
        violationType: 'LATE',
        effectiveFrom: '2023-01-01',
        fromMinute: 10,
        toMinute: 20,
        status: 'ACTIVE'
      });
      expect(result).toEqual({ id: 1, violationType: 'LATE' });
      expect(penaltiesRepo.create).toHaveBeenCalled();
    });

    it('2. throws BadRequestException when effectiveTo is before effectiveFrom', async () => {
      await expectRejectWithStatus(
        service.create({
          effectiveFrom: '2023-12-31',
          effectiveTo: '2023-01-01'
        }),
        400
      );
    });

    it('3. throws BadRequestException when fromMinute is greater than or equal to toMinute', async () => {
      await expectRejectWithStatus(
        service.create({
          fromMinute: 30,
          toMinute: 20
        }),
        400
      );
    });

    it('4. throws ConflictException when creating ACTIVE rule overlapping with another rule', async () => {
      penaltiesRepo.findOverlapping.mockResolvedValue([{
        violationType: 'LATE',
        effectiveFrom: '2023-01-01',
        fromMinute: 5,
        toMinute: 15
      }]);

      await expectRejectWithStatus(
        service.create({
          violationType: 'LATE',
          effectiveFrom: '2023-01-01',
          fromMinute: 10,
          toMinute: 20,
          status: 'ACTIVE'
        }),
        409
      );
    });

    it('5. creates penalty successfully when status is INACTIVE without checking overlap', async () => {
      penaltiesRepo.create.mockResolvedValue({ id: 2 });

      await service.create({
        violationType: 'LATE',
        effectiveFrom: '2023-01-01',
        fromMinute: 10,
        toMinute: 20,
        status: 'INACTIVE'
      });

      expect(penaltiesRepo.findOverlapping).not.toHaveBeenCalled();
      expect(penaltiesRepo.create).toHaveBeenCalled();
    });
  });

  describe('Edit Penalty', () => {
    // 5 test cases matching Excel

    it('1. successfully updates penalty rule with valid data', async () => {
      penaltiesRepo.findById.mockResolvedValue({ id: 1, status: 'ACTIVE', fromMinute: 10, toMinute: 20 });
      penaltiesRepo.findOverlapping.mockResolvedValue([]);
      penaltiesRepo.update.mockResolvedValue({ id: 1, toMinute: 30 });

      await service.update(1, { toMinute: 30 });
      expect(penaltiesRepo.update).toHaveBeenCalledWith(1, { toMinute: 30 });
    });

    it('2. throws NotFoundException when penalty ID does not exist', async () => {
      penaltiesRepo.findById.mockResolvedValue(null);

      await expectRejectWithStatus(
        service.update(99, { toMinute: 30 }),
        404
      );
    });

    it('3. throws BadRequestException when updating to invalid date range', async () => {
      penaltiesRepo.findById.mockResolvedValue({ id: 2, effectiveFrom: '2023-12-31' });

      await expectRejectWithStatus(
        service.update(2, { effectiveTo: '2023-01-01' }),
        400
      );
    });

    it('4. throws BadRequestException when updating to invalid minute range', async () => {
      penaltiesRepo.findById.mockResolvedValue({ id: 3, toMinute: 20 });

      await expectRejectWithStatus(
        service.update(3, { fromMinute: 30 }),
        400
      );
    });

    it('5. throws ConflictException when updating to ACTIVE causes overlap', async () => {
      penaltiesRepo.findById.mockResolvedValue({ id: 4, status: 'INACTIVE' });
      penaltiesRepo.findOverlapping.mockResolvedValue([{ violationType: 'EARLY_LEAVE' }]);

      await expectRejectWithStatus(
        service.update(4, { status: 'ACTIVE', fromMinute: 10, toMinute: 20 }),
        409
      );
    });
  });

  describe('Delete Penalty', () => {
    // 5 test cases matching context

    it('1. successfully deletes an existing penalty rule', async () => {
      penaltiesRepo.findById.mockResolvedValue({ id: 1 });
      await service.remove(1);
      expect(penaltiesRepo.delete).toHaveBeenCalledWith(1);
    });

    it('2. throws NotFoundException when trying to delete a non-existent penalty rule', async () => {
      penaltiesRepo.findById.mockResolvedValue(null);

      await expectRejectWithStatus(
        service.remove(99),
        404
      );
      expect(penaltiesRepo.delete).not.toHaveBeenCalled();
    });

    it('3. verifies repository delete method is called exactly once with correct ID', async () => {
      penaltiesRepo.findById.mockResolvedValue({ id: 5 });
      await service.remove(5);
      expect(penaltiesRepo.delete).toHaveBeenCalledTimes(1);
    });

    it('4. successfully deletes INACTIVE penalty rule', async () => {
      penaltiesRepo.findById.mockResolvedValue({ id: 6, status: 'INACTIVE' });
      await service.remove(6);
      expect(penaltiesRepo.delete).toHaveBeenCalledWith(6);
    });

    it('5. successfully deletes ACTIVE penalty rule', async () => {
      penaltiesRepo.findById.mockResolvedValue({ id: 7, status: 'ACTIVE' });
      await service.remove(7);
      expect(penaltiesRepo.delete).toHaveBeenCalledWith(7);
    });
  });
});
