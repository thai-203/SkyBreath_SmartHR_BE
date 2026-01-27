import { Response } from 'express';
import { ApiResponse } from '../interfaces/response.interface';

export class ResponseUtil {
    static sendResponse<T>(
        res: Response,
        message: string,
        data: T,
        statusCode: number = 200,
    ): void {
        const response: ApiResponse<T> = {
            statusCode,
            message,
            data,
            timestamp: new Date().toISOString(),
        };

        res.status(statusCode).json(response);
    }
}
