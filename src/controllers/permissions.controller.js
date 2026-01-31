import { AppMessages } from '../common/constants/index.js';
import { ResponseUtil } from '../common/utils/response.util.js';

export class PermissionsController {
    constructor(permissionsService) {
        this.permissionsService = permissionsService;
    }

    findAll = async (req, res, next) => {
        try {
            const result = await this.permissionsService.findAll();
            ResponseUtil.sendResponse(res, AppMessages.Success.General.SUCCESS, result);
        } catch (error) {
            next(error);
        }
    }
}
