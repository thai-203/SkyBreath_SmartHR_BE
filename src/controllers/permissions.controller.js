import { AppMessages } from '../common/constants/index.js';
import { ResponseUtil } from '../common/utils/response.util.js';

export class PermissionsController {
    constructor(permissionsService) {
        this.permissionsService = permissionsService;
    }

    findAll = async (req, res, next) => {
        try {
            console.log('[API] GET /permissions - Request started');
            const result = await this.permissionsService.findAll();
            console.log(`[API] GET /permissions - Success: Found ${result.length} permissions`);
            ResponseUtil.sendResponse(res, AppMessages.Success.Permission.RETRIEVED_ALL, result);
        } catch (error) {
            console.error('[API] GET /permissions - Error occurred:', error);
            next(error);
        }
    }
}
