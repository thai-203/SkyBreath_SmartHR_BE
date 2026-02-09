import { AppDataSource } from '../../database/data-source.js';

export const actionLogMiddleware = (req, res, next) => {
  if (req.method !== 'POST' || req.path !== '/auth/login') {
    return next();
  }
  let responseBody;
  const originalJson = res.json;

  res.json = function (body) {
    responseBody = body;
    return originalJson.call(this, body);
  };

  res.on('finish', async () => {
    try {
      const userId = req.user?.id || null;
      const requestIp = req.ip || null;
      const userAgent = req.headers['user-agent'] || null;

      const pathParts = req.path.split('/').filter(Boolean);
      const targetTable = pathParts[0] || null;
      const possibleId = pathParts[1];
      const targetRecordId =
        possibleId && !isNaN(possibleId) ? parseInt(possibleId) : null;

      const method = req.method;
      const actionType =
        method === 'POST'
          ? 'CREATE'
          : method === 'PUT'
            ? 'UPDATE'
            : method === 'DELETE'
              ? 'DELETE'
              : 'READ';

      // Attempt to fetch before data if applicable
      if (
        targetTable &&
        targetRecordId &&
        (actionType === 'UPDATE' ||
          actionType === 'DELETE' ||
          actionType === 'READ')
      ) {
        try {
          const rows = await AppDataSource.query(
            `SELECT * FROM \`${targetTable}\` WHERE id = ? LIMIT 1`,
            [targetRecordId],
          );
          beforeData = rows && rows[0] ? rows[0] : null;
        } catch (err) {
          // ignore failures to fetch
        }
      }

      const afterData = responseBody || (req.body ? req.body : null);

      const description = `${method} ${req.originalUrl} ${res.statusCode}`;

      const payload = {
        userId,
        actionType,
        targetTable,
        targetRecordId,
        beforeData,
        afterData,
        changedFields: null,
        description,
        requestIp,
        userAgent,
      };

      // Best-effort: dynamic import to avoid circular deps
      const { ActionLogsService } =
        await import('../../services/action-logs.service.js');
      const service = new ActionLogsService();
      await service.create(payload);
    } catch (err) {
      // don't let logging break responses
      console.error('ActionLog middleware error:', err);
    }
  });

  next();
};
