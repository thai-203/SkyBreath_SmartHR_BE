import { HttpException, HttpStatus } from '@nestjs/common';

export class BusinessException extends HttpException {
    constructor(
        message: string,
        errorCode?: string,
        statusCode: HttpStatus = HttpStatus.BAD_REQUEST,
    ) {
        super(
            {
                success: false,
                statusCode,
                message,
                errorCode,
                timestamp: new Date().toISOString(),
            },
            statusCode,
        );
    }
}
