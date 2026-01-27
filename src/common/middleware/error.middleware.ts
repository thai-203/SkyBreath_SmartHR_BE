import { Request, Response, NextFunction } from 'express';
import { HttpException } from '../exceptions/http.exception';
import { AppMessages } from '../constants';

export const errorMiddleware = (err: any, req: Request, res: Response, next: NextFunction) => {
    console.error(`[Error] ${req.method} ${req.url}`, err);

    let statusCode = 500;
    let message = 'Internal Server Error';
    let errorCode: string = AppMessages.Errors.General.INTERNAL_SERVER_ERROR.code;
    let errors = null;

    if (err instanceof HttpException) {
        statusCode = err.statusCode;
        message = err.message;
        errorCode = err.errorCode;
        errors = err.errors;
    } else if (err instanceof Error) {
        // Check if the error object has a statusCode property (legacy support)
        if ((err as any).statusCode) {
            statusCode = (err as any).statusCode;
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
