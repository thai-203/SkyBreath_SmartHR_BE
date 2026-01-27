import { AppMessages, SystemError } from '../constants';
import { HttpException } from './http.exception';

export class BadRequestException extends HttpException {
    constructor(errorOrMessage: string | SystemError = AppMessages.Errors.Validation.FAILED, errorCode?: string, errors?: any) {
        super(400, errorOrMessage, errorCode, errors);
    }
}
