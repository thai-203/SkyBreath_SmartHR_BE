import { HttpException } from './http.exception.js';

export class UnauthorizedException extends HttpException {
    constructor(errorOrMessage) {
        super(401, errorOrMessage);
    }
}
