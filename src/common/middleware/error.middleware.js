import { HttpException } from '../exceptions/http.exception.js';
import { AppMessages } from '../constants/index.js';
import { AppDataSource } from '../../database/data-source.js';
import { getRequestContext } from '../context/request-context.js';
import { ActionLogEntity } from '../../models/entities/action-log.entity.js';

export const errorMiddleware = async (err, req, res, next) => {
  console.error(`[Error] ${req.method} ${req.url}`, err);

  let statusCode = 500;
  let message = 'Internal Server Error';
  let errorCode = AppMessages.Errors.General.INTERNAL_SERVER_ERROR.code;
  let errors = null;

  if (err instanceof HttpException) {
    statusCode = err.statusCode;
    message = err.message;
    errorCode = err.errorCode;
    errors = err.errors;
  } else if (err instanceof Error) {
    // Check if the error object has a statusCode property (legacy support)
    if (err.statusCode) {
      statusCode = err.statusCode;
    }
    message = err.message;
  }

  console.log(message);
  

  try {
    if (req.method !== 'GET') {
      const ctx = getRequestContext();

      await AppDataSource.getRepository(ActionLogEntity).insert({
        userId: ctx?.userId ?? null,
        actionType: ctx?.customAction ?? `${req.method} ${req.baseUrl}`,
        targetTable: null,
        targetRecordId: null,
        status: 'FAILED',
        errorMessage: message,
        requestIp: ctx?.ip ?? req.ip,
        userAgent: ctx?.userAgent ?? req.headers['user-agent'],
      });
    }
  } catch (logErr) {
    console.error('Audit log failed:', logErr);
  }

  res.status(statusCode).json({
    statusCode,
    message,
    errorCode,
    errors,
    timestamp: new Date().toISOString(),
    path: req.url,
  });
};
