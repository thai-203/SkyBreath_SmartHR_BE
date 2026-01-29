import { HttpException } from '../exceptions/http.exception.js';
import { AppMessages } from '../constants/index.js';

export const errorMiddleware = (err, req, res, next) => {
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

    res.status(statusCode).json({
        statusCode,
        message,
        errorCode,
        errors,
        timestamp: new Date().toISOString(),
        path: req.url,
    });
};
