import { HttpException } from './http.exception.js';

export class BadRequestException extends HttpException {
    constructor(errorOrMessage, errors) {
        super(400, errorOrMessage, undefined, errors);
    }
}
