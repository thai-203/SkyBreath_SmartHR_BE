import { HttpException, HttpStatus } from '@nestjs/common';

export class ValidationException extends HttpException {
    constructor(errors: Record<string, string[]>) {
        super(
            {
                success: false,
                statusCode: HttpStatus.UNPROCESSABLE_ENTITY,
                message: 'Validation failed',
                errors,
                timestamp: new Date().toISOString(),
            },
            HttpStatus.UNPROCESSABLE_ENTITY,
        );
    }
}
