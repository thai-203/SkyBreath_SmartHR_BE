export class HttpException extends Error {
    constructor(statusCode, errorOrMessage, errorCode, errors) {
        if (typeof errorOrMessage === 'string') {
            super(errorOrMessage);
            this.errorCode = errorCode || 'UNKNOWN';
        } else {
            super(errorOrMessage.message);
            this.errorCode = errorOrMessage.code;
        }
        this.statusCode = statusCode;
        this.errors = errors;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
