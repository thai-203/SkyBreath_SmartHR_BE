import 'reflect-metadata';
import { NotificationsService } from '../notifications.service.js';
import { NotificationsRepository } from '../../repositories/notifications.repository.js';
import { AppDataSource } from '../../database/data-source.js';
import { getIO } from '../../config/socket.js';
import { NotificationEntity } from '../../models/entities/notification.entity.js';
import { NotificationRecipientEntity } from '../../models/entities/notification-recipient.entity.js';
import { UserEntity } from '../../models/entities/user.entity.js';
import { EmployeeEntity } from '../../models/entities/employee.entity.js';
import {
  NotificationDeliveryStatus,
  NotificationSendStatus,
  NotificationSourceType,
} from '../../common/enums/notification.enum.js';

jest.mock('../../repositories/notifications.repository.js', () => ({
  NotificationsRepository: jest.fn(),
}));

jest.mock('../../database/data-source.js', () => ({
  AppDataSource: {
    getRepository: jest.fn(),
  },
}));

jest.mock('../../config/socket.js', () => ({
  getIO: jest.fn(),
}));

describe('NotificationsService', () => {
  let service;
  let notificationRepo;
  let recipientRepo;
  let notifRepo;
  let userRepo;
  let employeeRepo;
  let io;

  beforeEach(() => {
    jest.clearAllMocks();

    notificationRepo = {
      create: jest.fn((payload) => ({
        id: 1,
        createdAt: new Date('2026-04-21T00:00:00.000Z'),
        ...payload,
      })),
      save: jest.fn(async (payload) => ({ ...payload })),
      update: jest.fn(),
    };

    recipientRepo = {
      save: jest.fn(),
      createQueryBuilder: jest.fn(),
      count: jest.fn(),
      findOne: jest.fn(),
    };

    notifRepo = {
      updateRecipientDelivery: jest.fn(),
      findScheduledPending: jest.fn(),
      findHistory: jest.fn(),
      findHistoryById: jest.fn(),
    };

    userRepo = {
      find: jest.fn(),
    };

    employeeRepo = {
      createQueryBuilder: jest.fn(),
    };

    io = {
      to: jest.fn().mockReturnValue({
        emit: jest.fn(),
      }),
    };

    AppDataSource.getRepository.mockImplementation((entity) => {
      if (entity === NotificationEntity) {
        return notificationRepo;
      }
      if (entity === NotificationRecipientEntity) {
        return recipientRepo;
      }
      if (entity === UserEntity) {
        return userRepo;
      }
      if (entity === EmployeeEntity) {
        return employeeRepo;
      }
      return {};
    });

    NotificationsRepository.mockImplementation(() => notifRepo);
    getIO.mockReturnValue(io);

    service = new NotificationsService();
  });

  it('creates notification, recipients and delivery status updates', async () => {
    const saved = {
      id: 55,
      title: 'New request',
      message: 'Please review',
      notificationType: 'WORKFLOW',
      sourceType: NotificationSourceType.WORKFLOW,
      createdAt: new Date('2026-04-21T00:00:00.000Z'),
    };
    notificationRepo.save.mockResolvedValue(saved);

    const result = await service.createAndNotify({
      title: 'New request',
      message: 'Please review',
      recipientUserIds: [10, 11],
      recipientScope: 'USERS',
      recipientScopeIds: [10, 11],
    });

    expect(notificationRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'New request',
        message: 'Please review',
        sendStatus: NotificationSendStatus.SENT,
        recipientScope: 'USERS',
      }),
    );
    expect(recipientRepo.save).toHaveBeenCalledWith([
      expect.objectContaining({ notificationId: 55, userId: 10 }),
      expect.objectContaining({ notificationId: 55, userId: 11 }),
    ]);
    expect(notifRepo.updateRecipientDelivery).toHaveBeenCalledWith(
      55,
      NotificationDeliveryStatus.DELIVERED,
    );
    expect(io.to).toHaveBeenCalledWith('user_10');
    expect(io.to).toHaveBeenCalledWith('user_11');
    expect(result).toEqual(saved);
  });

  it('returns scheduled metadata when manual notification is queued', async () => {
    notificationRepo.save.mockResolvedValue({
      id: 77,
      scheduledAt: new Date('2026-05-01T00:00:00.000Z'),
    });

    const result = await service.sendManualNotification({
      title: '  Scheduled notice  ',
      message: '  Please read  ',
      recipientScope: 'USERS',
      scopeIds: [1],
      scheduledAt: '2026-05-01T00:00:00.000Z',
      sentBy: 5,
    });

    expect(notificationRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Scheduled notice',
        message: 'Please read',
        sendStatus: NotificationSendStatus.SCHEDULED,
      }),
    );
    expect(result).toEqual({
      id: 77,
      status: NotificationSendStatus.SCHEDULED,
      scheduledAt: new Date('2026-05-01T00:00:00.000Z'),
    });
  });

  it('deduplicates recipients and sends manual notification immediately', async () => {
    service.createAndNotify = jest.fn().mockResolvedValue({ id: 88 });

    const result = await service.sendManualNotification({
      title: 'Notice',
      message: 'Body',
      recipientScope: 'USERS',
      scopeIds: [3, 3, 4],
      sentBy: 6,
    });

    expect(service.createAndNotify).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Notice',
        message: 'Body',
        recipientUserIds: [3, 4],
        recipientScope: 'USERS',
        recipientScopeIds: [3, 3, 4],
      }),
    );
    expect(result).toEqual({
      recipientCount: 2,
      status: NotificationSendStatus.SENT,
    });
  });

  it('resolves recipient ids from active users and processes pending scheduled notifications', async () => {
    userRepo.find.mockResolvedValue([{ id: 21 }, { id: 22 }]);
    notifRepo.findScheduledPending.mockResolvedValue([
      {
        id: 91,
        recipientScope: 'ALL',
        recipientScopeIds: null,
      },
    ]);
    recipientRepo.save.mockResolvedValue([]);

    const result = await service._resolveRecipientUserIds('ALL');

    expect(result).toEqual([21, 22]);

    service._resolveRecipientUserIds = jest.fn().mockResolvedValue([21, 22]);
    await service.processPendingScheduledNotifications();

    expect(recipientRepo.save).toHaveBeenCalledWith([
      expect.objectContaining({ notificationId: 91, userId: 21 }),
      expect.objectContaining({ notificationId: 91, userId: 22 }),
    ]);
    expect(notifRepo.updateRecipientDelivery).toHaveBeenCalledWith(
      91,
      NotificationDeliveryStatus.DELIVERED,
    );
    expect(notificationRepo.update).toHaveBeenCalledWith(91, {
      sendStatus: NotificationSendStatus.SENT,
      sentAt: expect.any(Date),
    });
  });
});
