import { EventSubscriber } from 'typeorm';
import { ActionLogEntity } from '../../models/entities/action-log.entity';
import { getRequestContext } from '../context/request-context';

@EventSubscriber()
export class AuditSubscriber {
  shouldIgnore(event) {
    return event.metadata.tableName === 'action_logs';
  }

  async writeLog(event, payload) {
    if (this.shouldIgnore(event)) return;

    try {
      const ctx = getRequestContext();
      
      await event.manager.insert(ActionLogEntity, {
        targetTable: event.metadata.tableName,
        targetRecordId: event.entity?.id ?? event.databaseEntity?.id ?? null,
        ...payload,
        status: "SUCCESS",
        errorMessage: null,
        userId: ctx?.userId ?? null,
        requestIp: ctx?.ip ?? null,
        userAgent: ctx?.userAgent ?? null,
      });
    } catch (err) {
      console.error('Audit log error:', err);
    }
  }

  afterInsert(event) {
    return this.writeLog(event, {
      actionType: 'CREATE',
      beforeData: null,
      afterData: event.entity ?? event.databaseEntity,
    });
  }

  afterUpdate(event) {
    return this.writeLog(event, {
      actionType: 'UPDATE',
      beforeData: event.databaseEntity,
      afterData: event.entity ?? event.databaseEntity,
      changedFields: event.updatedColumns?.map((c) => c.propertyName) ?? [],
    });
  }

  afterRemove(event) {
    return this.writeLog(event, {
      actionType: 'DELETE',
      beforeData: event.databaseEntity,
      afterData: null,
    });
  }
}
