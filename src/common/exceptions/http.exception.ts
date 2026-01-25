import { SystemError } from '../constants/app-messages.constant';

export class HttpException extends Error {
    public statusCode: number;
    public errorCode: string;
    public errors?: any;

    constructor(statusCode: number, errorOrMessage: string | SystemError, errorCode?: string, errors?: any) {
        if (typeof errorOrMessage === 'string') {
            super(errorOrMessage);
            this.errorCode = errorCode || 'UNKNOWN';
        } else {
            super(errorOrMessage.message);
            this.errorCode = errorOrMessage.code;
        }
        this.statusCode = statusCode;
        this.errors = errors;
        Object.setPrototypeOf(this, HttpException.prototype);
    }
}
