import { ShiftGroupsService } from '../shift-groups.service.js';
import { ShiftGroupsRepository } from '../../repositories/shift-groups.repository.js';

jest.mock('../../repositories/shift-groups.repository.js', () => ({
  ShiftGroupsRepository: jest.fn(),
}));

describe('ShiftGroupsService', () => {
  let service;
  let shiftGroupsRepo;

  beforeEach(() => {
    jest.clearAllMocks();

    shiftGroupsRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      hasShifts: jest.fn(),
      softDelete: jest.fn(),
    };

    ShiftGroupsRepository.mockImplementation(() => shiftGroupsRepo);
    service = new ShiftGroupsService();
  });

  const expectHttpError = async (promise, statusCode, message) => {
    await expect(promise).rejects.toMatchObject({
      statusCode,
      message,
    });
  };

  describe('Create Shift Group', () => {
    it.each([
      {
        title: 'Tạo mới nhóm ca thành công với status active',
        input: {
          groupName: 'Ca 1',
          status: 'active',
          description: 'Ca số 1',
        },
      },
      {
        title: 'Tạo mới nhóm ca thành công với status inactive',
        input: {
          groupName: 'Ca 1',
          status: 'inactive',
          description: 'Ca số 1',
        },
      },
    ])('$title', async ({ input }) => {
      const createdGroup = { id: 1, ...input };
      shiftGroupsRepo.findAll.mockResolvedValue({ items: [], total: 0 });
      shiftGroupsRepo.create.mockResolvedValue(createdGroup);

      const result = await service.create(input);

      expect(shiftGroupsRepo.findAll).toHaveBeenCalledWith({
        search: 'Ca 1',
        skip: 0,
        take: 1,
      });
      expect(shiftGroupsRepo.create).toHaveBeenCalledWith(input);
      expect(result).toEqual(createdGroup);
    });

    it('Không cho tạo nếu nhóm ca đã tồn tại', async () => {
      shiftGroupsRepo.findAll.mockResolvedValue({
        items: [{ id: 2, groupName: 'Ca 2' }],
        total: 1,
      });

      await expectHttpError(
        service.create({
          groupName: 'Ca 2',
          status: 'active',
          description: 'Ca số 2',
        }),
        409,
        'Nhóm ca đã tồn tại',
      );

      expect(shiftGroupsRepo.create).not.toHaveBeenCalled();
    });

    it('Không cho tạo nếu tên nhóm ca trống', async () => {
      await expectHttpError(
        service.create({
          groupName: '   ',
          status: 'active',
          description: 'Ca số 1',
        }),
        400,
        'Tên nhóm ca không được để trống',
      );

      expect(shiftGroupsRepo.findAll).not.toHaveBeenCalled();
      expect(shiftGroupsRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('Update Shift Group', () => {
    it('Cập nhật nhóm ca thành công', async () => {
      shiftGroupsRepo.findById.mockResolvedValue({
        id: 10,
        groupName: 'Ca cũ',
        status: 'active',
        description: 'Mô tả cũ',
      });
      shiftGroupsRepo.findAll.mockResolvedValue({ items: [], total: 0 });
      shiftGroupsRepo.update.mockResolvedValue({
        id: 10,
        groupName: 'Ca 1',
        status: 'active',
        description: '123213',
      });

      const result = await service.update(10, {
        groupName: 'Ca 1',
        status: 'active',
        description: '123213',
      });

      expect(shiftGroupsRepo.findById).toHaveBeenCalledWith(10);
      expect(shiftGroupsRepo.findAll).toHaveBeenCalledWith({
        search: 'Ca 1',
        skip: 0,
        take: 1,
      });
      expect(shiftGroupsRepo.update).toHaveBeenCalledWith(10, {
        groupName: 'Ca 1',
        status: 'active',
        description: '123213',
      });
      expect(result).toEqual({
        id: 10,
        groupName: 'Ca 1',
        status: 'active',
        description: '123213',
      });
    });

    it('Không cho cập nhật nếu tên nhóm ca rỗng', async () => {
      shiftGroupsRepo.findById.mockResolvedValue({
        id: 11,
        groupName: 'Ca cũ',
        status: 'active',
      });

      await expectHttpError(
        service.update(11, {
          groupName: '',
          status: 'active',
          description: '123213',
        }),
        400,
        'Tên nhóm ca không được để trống',
      );

      expect(shiftGroupsRepo.findById).toHaveBeenCalledWith(11);
      expect(shiftGroupsRepo.findAll).not.toHaveBeenCalled();
      expect(shiftGroupsRepo.update).not.toHaveBeenCalled();
    });

    it('Cho phép cập nhật trạng thái inactive khi nhóm ca không có shift liên kết', async () => {
      shiftGroupsRepo.findById.mockResolvedValue({
        id: 12,
        groupName: 'Ca 1',
        status: 'active',
      });
      shiftGroupsRepo.hasShifts.mockResolvedValue(false);
      shiftGroupsRepo.update.mockResolvedValue({
        id: 12,
        groupName: 'Ca 1',
        status: 'inactive',
        description: '123213',
      });

      const result = await service.update(12, {
        status: 'inactive',
        description: '123213',
      });

      expect(shiftGroupsRepo.findById).toHaveBeenCalledWith(12);
      expect(shiftGroupsRepo.hasShifts).toHaveBeenCalledWith(12);
      expect(shiftGroupsRepo.update).toHaveBeenCalledWith(12, {
        status: 'inactive',
        description: '123213',
      });
      expect(result).toEqual({
        id: 12,
        groupName: 'Ca 1',
        status: 'inactive',
        description: '123213',
      });
    });

    it('Không cho cập nhật nếu nhóm ca đang có shift liên kết và chuyển sang inactive', async () => {
      shiftGroupsRepo.findById.mockResolvedValue({
        id: 13,
        groupName: 'Ca 1',
        status: 'active',
      });
      shiftGroupsRepo.hasShifts.mockResolvedValue(true);

      await expectHttpError(
        service.update(13, {
          status: 'inactive',
        }),
        409,
        'Nhóm ca đang có ca làm việc, không thể thực hiện thao tác này',
      );

      expect(shiftGroupsRepo.update).not.toHaveBeenCalled();
    });
  });
});
