export class BaseResponseDto {
    constructor(data, message = 'Success') {
        this.success = true;
        this.data = data;
        this.message = message;
        this.timestamp = new Date().toISOString();
    }
}

export class ErrorResponseDto {
}
