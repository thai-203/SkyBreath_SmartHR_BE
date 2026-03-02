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

    create = async (req, res, next) => {
        try {
            const result = await this.permissionsService.create(req.body);
            ResponseUtil.sendResponse(res, AppMessages.Success.Permission.CREATED, result);
        } catch (error) {
            next(error);
        }
    }

    update = async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await this.permissionsService.update(id, req.body);
            ResponseUtil.sendResponse(res, AppMessages.Success.Permission.UPDATED, result);
        } catch (error) {
            next(error);
        }
    }

    delete = async (req, res, next) => {
        try {
            const { id } = req.params;
            await this.permissionsService.delete(id);
            ResponseUtil.sendResponse(res, AppMessages.Success.Permission.DELETED);
        } catch (error) {
            next(error);
        }
    }
}
