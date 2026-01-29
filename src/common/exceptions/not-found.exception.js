import { HttpException } from './http.exception.js';

export class NotFoundException extends HttpException {
    constructor(errorOrMessage) {
        super(404, errorOrMessage);
    }
}
