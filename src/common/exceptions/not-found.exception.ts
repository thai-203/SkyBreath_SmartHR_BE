import { AppMessages, SystemError } from '../constants';
import { HttpException } from './http.exception';

export class NotFoundException extends HttpException {
    constructor(errorOrMessage: string | SystemError = AppMessages.Errors.General.NOT_FOUND, errorCode?: string) {
        super(404, errorOrMessage, errorCode);
    }
}
