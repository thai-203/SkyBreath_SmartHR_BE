import { AppMessages, SystemError } from '../constants';
import { HttpException } from './http.exception';

export class ForbiddenException extends HttpException {
    constructor(errorOrMessage: string | SystemError = AppMessages.Errors.Auth.FORBIDDEN, errorCode?: string) {
        super(403, errorOrMessage, errorCode);
    }
}
