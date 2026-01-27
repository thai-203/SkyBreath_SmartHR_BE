import { AppMessages, SystemError } from '../constants';
import { HttpException } from './http.exception';

export class ConflictException extends HttpException {
    constructor(errorOrMessage: string | SystemError = AppMessages.Errors.General.RESOURCE_ALREADY_EXISTS, errorCode?: string) {
        super(409, errorOrMessage, errorCode);
    }
}
