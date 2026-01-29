import { HttpException } from './http.exception.js';

export class ConflictException extends HttpException {
    constructor(errorOrMessage) {
        super(409, errorOrMessage);
    }
}
