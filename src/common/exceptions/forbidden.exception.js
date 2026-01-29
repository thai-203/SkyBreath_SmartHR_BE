import { HttpException } from './http.exception.js';

export class ForbiddenException extends HttpException {
    constructor(errorOrMessage) {
        super(403, errorOrMessage);
    }
}
