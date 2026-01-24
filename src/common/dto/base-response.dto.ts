import { ApiProperty } from '@nestjs/swagger';

export class BaseResponseDto<T> {
    @ApiProperty({ example: true })
    success: boolean;

    @ApiProperty()
    data: T;

    @ApiProperty({ example: 'Success' })
    message: string;

    @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
    timestamp: string;

    constructor(data: T, message: string = 'Success') {
        this.success = true;
        this.data = data;
        this.message = message;
        this.timestamp = new Date().toISOString();
    }
}

export class ErrorResponseDto {
    @ApiProperty({ example: false })
    success: boolean;

    @ApiProperty({ example: 400 })
    statusCode: number;

    @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
    timestamp: string;

    @ApiProperty({ example: '/api/v1/users' })
    path: string;

    @ApiProperty({ example: 'GET' })
    method: string;

    @ApiProperty({ example: 'Error message' })
    message: string | string[];

    @ApiProperty({ example: 'BAD_REQUEST', required: false })
    error?: string;
}
