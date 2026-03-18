import { HttpException } from '../exceptions/http.exception.js';
import { AppMessages } from '../constants/index.js';
import { AppDataSource } from '../../database/data-source.js';
import { getRequestContext } from '../context/request-context.js';
import { ActionLogEntity } from '../../models/entities/action-log.entity.js';

<<<<<<< Updated upstream
export const errorMiddleware = async (err, req, res, next) => {
=======
export const errorMiddleware = (err, req, res, next) => {
>>>>>>> Stashed changes
  console.error(`[Error] ${req.method} ${req.url}`, err);

  let statusCode = 500;
  let message = 'Internal Server Error';
  let errorCode = AppMessages.Errors.General.INTERNAL_SERVER_ERROR.code;
  let errors = null;

<<<<<<< Updated upstream
  if (err instanceof HttpException) {
=======
  // validateOrReject throws an array of ValidationError
  if (
    Array.isArray(err) &&
    err.length > 0 &&
    err[0]?.constraints !== undefined
  ) {
    statusCode = 400;
    message = 'Dữ liệu không hợp lệ';
    errorCode = 'VALIDATION_ERROR';
    errors = err.map((e) => ({
      property: e.property,
      constraints: e.constraints,
    }));
  } else if (err instanceof HttpException) {
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
  try {
    if (req.method !== 'GET') {
      const ctx = getRequestContext();

      await AppDataSource.getRepository(ActionLogEntity).insert({
        userId: ctx?.userId ?? null,
        actionType: `${req.method} ${req.baseUrl}`,
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

=======
>>>>>>> Stashed changes
  res.status(statusCode).json({
    statusCode,
    message,
    errorCode,
    errors,
    timestamp: new Date().toISOString(),
    path: req.url,
  });
};
