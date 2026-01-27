import { AppMessages, SystemError } from '../constants';
import { HttpException } from './http.exception';

export class UnauthorizedException extends HttpException {
    constructor(errorOrMessage: string | SystemError = AppMessages.Errors.Auth.UNAUTHORIZED, errorCode?: string) {
        super(401, errorOrMessage, errorCode);
    }
}
