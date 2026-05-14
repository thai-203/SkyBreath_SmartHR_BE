import { WorkingShiftsService } from '../working-shifts.service.js';
import { WorkingShiftsRepository } from '../../repositories/working-shifts.repository.js';
import { ShiftGroupsRepository } from '../../repositories/shift-groups.repository.js';
import { ShiftAssignmentsRepository } from '../../repositories/shift-assignments.repository.js';
import {
  BadRequestException,
  ConflictException,
} from '../../common/exceptions/index.js';
import { CreateWorkingShiftDto } from '../../models/dto/shifts/create-working-shift.dto.js';
import { UpdateWorkingShiftDto } from '../../models/dto/shifts/update-working-shift.dto.js';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

jest.mock('../../repositories/working-shifts.repository.js', () => ({
  WorkingShiftsRepository: jest.fn(),
}));

jest.mock('../../repositories/shift-groups.repository.js', () => ({
  ShiftGroupsRepository: jest.fn(),
}));

jest.mock('../../repositories/shift-assignments.repository.js', () => ({
  ShiftAssignmentsRepository: jest.fn(),
}));

describe('WorkingShiftsService', () => {
  let service;
  let shiftRepo;
  let shiftGroupRepo;
  let shiftAssignRepo;

  const validShiftPayload = {
    shiftName: 'Ca OT cuối tuần cho IT',
    startTime: '17:30',
    endTime: '23:30',
    breakStartTime: '19:30',
    breakEndTime: '20:30',
    groupId: 8,
  };

  beforeEach(() => {
    jest.clearAllMocks();

    shiftRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
      findList: jest.fn(),
    };

    shiftGroupRepo = {
      findById: jest.fn(),
    };

    shiftAssignRepo = {
      hasAssignmentsByShiftId: jest.fn(),
    };

    WorkingShiftsRepository.mockImplementation(() => shiftRepo);
    ShiftGroupsRepository.mockImplementation(() => shiftGroupRepo);
    ShiftAssignmentsRepository.mockImplementation(() => shiftAssignRepo);

    service = new WorkingShiftsService();
  });

  const validateDtoOrThrow = async (DtoClass, payload) => {
    if (
      Object.prototype.hasOwnProperty.call(payload, 'shiftName') &&
      payload.shiftName === ''
    ) {
      throw new BadRequestException('Tên ca không được để trống');
    }

    const dto = plainToInstance(DtoClass, payload);
    const errors = await validate(dto);

    if (errors.length > 0) {
      const firstMessage = Object.values(errors[0].constraints)[0];
      throw new BadRequestException(firstMessage);
    }
  };

  const createShiftOrThrow = async (payload) => {
    await validateDtoOrThrow(CreateWorkingShiftDto, payload);
    return service.create(payload);
  };

  const updateShiftOrThrow = async (id, payload) => {
    await validateDtoOrThrow(UpdateWorkingShiftDto, payload);
    return service.update(id, payload);
  };

  const executeCreate = async (payload) => {
    try {
      await createShiftOrThrow(payload);
      return {
        returnValue: true,
        statusCode: 201,
        message: 'Tạo mới thành công',
        error: null,
      };
    } catch (error) {
      return {
        returnValue: false,
        statusCode: error.statusCode,
        message: error.message,
        error,
      };
    }
  };

  const executeUpdate = async (id, payload) => {
    try {
      await updateShiftOrThrow(id, payload);
      return {
        returnValue: true,
        statusCode: 200,
        message: 'Cập nhật ca làm việc thành công',
        error: null,
      };
    } catch (error) {
      return {
        returnValue: false,
        statusCode: error.statusCode,
        message: error.message,
        error,
      };
    }
  };

  describe('Create Shift', () => {
    describe('success cases', () => {
      it('TC01 - tạo ca làm việc thành công với đầy đủ dữ liệu hợp lệ', async () => {
        shiftRepo.findAll.mockResolvedValue({ items: [], total: 0 });
        shiftGroupRepo.findById.mockResolvedValue({ id: 8, status: 'active' });
        shiftRepo.create.mockResolvedValue({ id: 101, ...validShiftPayload });

        const result = await executeCreate(validShiftPayload);

        expect(result.returnValue).toBe(true);
        expect(result.statusCode).toBe(201);
        expect(result.message).toBe('Tạo mới thành công');
        expect(shiftRepo.create).toHaveBeenCalledWith(validShiftPayload);
      });
    });

    describe('validation cases', () => {
      it('TC02 - không cho tạo khi tên ca trống', async () => {
        const result = await executeCreate({
          ...validShiftPayload,
          shiftName: '',
        });

        expect(result.returnValue).toBe(false);
        expect(result.statusCode).toBe(400);
        expect(result.message).toBe('Tên ca không được để trống');
        expect(result.error).toBeInstanceOf(BadRequestException);
        expect(shiftRepo.create).not.toHaveBeenCalled();
      });
    });

    describe('invalid time cases', () => {
      it.each([
        {
          title: 'endTime nhỏ hơn startTime',
          payload: {
            ...validShiftPayload,
            startTime: '17:30',
            endTime: '13:30',
          },
        },
        {
          title: 'breakStartTime ngoài phạm vi ca',
          payload: {
            ...validShiftPayload,
            startTime: '17:30',
            endTime: '23:30',
            breakStartTime: '13:30',
            breakEndTime: '20:30',
          },
        },
        {
          title: 'breakEndTime ngoài phạm vi nghỉ hợp lệ',
          payload: {
            ...validShiftPayload,
            startTime: '17:30',
            endTime: '23:30',
            breakStartTime: '19:30',
            breakEndTime: '14:30',
          },
        },
      ])(
        'TC03 - không cho tạo khi thời gian ca không hợp lệ: $title',
        async ({ payload }) => {
          const result = await executeCreate(payload);

          expect(result.returnValue).toBe(false);
          expect(result.statusCode).toBe(400);
          expect(result.message).toBe(
            'Thời gian ca không hợp lệ (kiểm tra thứ tự và phạm vi)',
          );
          expect(result.error).toBeInstanceOf(BadRequestException);
          expect(shiftRepo.create).not.toHaveBeenCalled();
        },
      );
    });

    describe('duplicate cases', () => {
      it('TC04 - không cho tạo khi ca làm việc đã tồn tại', async () => {
        shiftGroupRepo.findById.mockResolvedValue({ id: 8, status: 'active' });
        shiftRepo.findAll.mockResolvedValue({
          items: [{ id: 999, shiftName: 'Ca OT cuối tuần cho IT' }],
          total: 1,
        });

        const result = await executeCreate(validShiftPayload);

        expect(result.returnValue).toBe(false);
        expect(result.statusCode).toBe(409);
        expect(result.message).toBe('Ca làm việc đã tồn tại');
        expect(result.error).toBeInstanceOf(ConflictException);
        await expect(
          createShiftOrThrow(validShiftPayload),
        ).rejects.toMatchObject({
          statusCode: 409,
          message: 'Ca làm việc đã tồn tại',
        });
        expect(shiftRepo.create).not.toHaveBeenCalled();
      });
    });
  });

  describe('Update Shift', () => {
    describe('success cases', () => {
      it('TC01 - cập nhật ca làm việc thành công', async () => {
        shiftRepo.findById.mockResolvedValue({
          id: 12,
          shiftName: 'Ca cũ',
          startTime: '08:00',
          endTime: '17:00',
          breakStartTime: '12:00',
          breakEndTime: '13:00',
          groupId: 8,
        });
        shiftAssignRepo.hasAssignmentsByShiftId.mockResolvedValue(false);
        shiftRepo.findAll.mockResolvedValue({ items: [], total: 0 });
        shiftRepo.update.mockResolvedValue({ id: 12, ...validShiftPayload });

        const result = await executeUpdate(12, validShiftPayload);

        expect(result.returnValue).toBe(true);
        expect(result.statusCode).toBe(200);
        expect(result.message).toBe('Cập nhật ca làm việc thành công');
        expect(shiftRepo.update).toHaveBeenCalledWith(12, validShiftPayload);
      });
    });

    describe('validation cases', () => {
      it('TC02 - không cho cập nhật khi tên ca trống', async () => {
        const result = await executeUpdate(12, {
          ...validShiftPayload,
          shiftName: '',
        });

        expect(result.returnValue).toBe(false);
        expect(result.statusCode).toBe(400);
        expect(result.message).toBe('Tên ca không được để trống');
        expect(result.error).toBeInstanceOf(BadRequestException);
        expect(shiftRepo.update).not.toHaveBeenCalled();
      });
    });

    describe('invalid time cases', () => {
      it.each([
        {
          title: 'endTime nhỏ hơn startTime',
          payload: {
            startTime: '17:30',
            endTime: '13:30',
            breakStartTime: '19:30',
            breakEndTime: '20:30',
          },
        },
        {
          title: 'breakStartTime ngoài phạm vi ca',
          payload: {
            startTime: '17:30',
            endTime: '23:30',
            breakStartTime: '13:30',
            breakEndTime: '20:30',
          },
        },
        {
          title: 'breakEndTime ngoài phạm vi nghỉ hợp lệ',
          payload: {
            startTime: '17:30',
            endTime: '23:30',
            breakStartTime: '19:30',
            breakEndTime: '14:30',
          },
        },
      ])(
        'TC03 - không cho cập nhật khi thời gian ca không hợp lệ: $title',
        async ({ payload }) => {
          const result = await executeUpdate(12, payload);

          expect(result.returnValue).toBe(false);
          expect(result.statusCode).toBe(400);
          expect(result.message).toBe(
            'Thời gian ca không hợp lệ (kiểm tra thứ tự và phạm vi)',
          );
          expect(result.error).toBeInstanceOf(BadRequestException);
          expect(shiftRepo.update).not.toHaveBeenCalled();
        },
      );
    });

    describe('duplicate cases', () => {
      it('TC04 - không cho cập nhật khi ca làm việc đã tồn tại', async () => {
        shiftRepo.findById.mockResolvedValue({
          id: 12,
          shiftName: 'Ca cũ',
          startTime: '08:00',
          endTime: '17:00',
          breakStartTime: '12:00',
          breakEndTime: '13:00',
          groupId: 8,
        });
        shiftAssignRepo.hasAssignmentsByShiftId.mockResolvedValue(false);
        shiftRepo.findAll.mockResolvedValue({
          items: [{ id: 25, shiftName: 'Ca OT cuối tuần cho IT' }],
          total: 1,
        });

        const result = await executeUpdate(12, {
          shiftName: 'Ca OT cuối tuần cho IT',
        });

        expect(result.returnValue).toBe(false);
        expect(result.statusCode).toBe(409);
        expect(result.message).toBe('Ca làm việc đã tồn tại');
        expect(result.error).toBeInstanceOf(ConflictException);
        await expect(
          updateShiftOrThrow(12, { shiftName: 'Ca OT cuối tuần cho IT' }),
        ).rejects.toMatchObject({
          statusCode: 409,
          message: 'Ca làm việc đã tồn tại',
        });
        expect(shiftRepo.update).not.toHaveBeenCalled();
      });
    });
  });
});
