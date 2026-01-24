import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
    private readonly logger = new Logger(HttpExceptionFilter.name);

    catch(exception: HttpException, host: ArgumentsHost): void {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();
        const status = exception.getStatus();
        const exceptionResponse = exception.getResponse();

        const errorResponse = {
            success: false,
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            method: request.method,
            message:
                typeof exceptionResponse === 'object' &&
                    'message' in exceptionResponse
                    ? exceptionResponse.message
                    : exceptionResponse,
            error:
                typeof exceptionResponse === 'object' && 'error' in exceptionResponse
                    ? exceptionResponse.error
                    : HttpStatus[status],
        };

        this.logger.error(
            `${request.method} ${request.url} - ${status}`,
            JSON.stringify(errorResponse),
        );

        response.status(status).json(errorResponse);
    }
}
