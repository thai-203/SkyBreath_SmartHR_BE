import { AppMessages } from '../common/constants/index.js';
import { ResponseUtil } from '../common/utils/response.util.js';

export class RolesController {
    constructor(rolesService) {
        this.rolesService = rolesService;
    }

    create = async (req, res, next) => {
        try {
            const result = await this.rolesService.create(req.body);
            ResponseUtil.sendResponse(res, AppMessages.Success.Role.CREATED, result, 201);
        } catch (error) {
            next(error);
        }
    }

    findAll = async (req, res, next) => {
        try {
            const query = req.query;
            const result = await this.rolesService.findAll(query);
            ResponseUtil.sendResponse(res, AppMessages.Success.Role.RETRIEVED_ALL, result);
        } catch (error) {
            next(error);
        }
    }

    findOne = async (req, res, next) => {
        try {
            const result = await this.rolesService.findById(parseInt(req.params.id));
            ResponseUtil.sendResponse(res, AppMessages.Success.Role.RETRIEVED, result);
        } catch (error) {
            next(error);
        }
    }

    update = async (req, res, next) => {
        try {
            const result = await this.rolesService.update(parseInt(req.params.id), req.body);
            ResponseUtil.sendResponse(res, AppMessages.Success.Role.UPDATED, result);
        } catch (error) {
            next(error);
        }
    }

    assignPermissions = async (req, res, next) => {
        try {
            const { permissionIds } = req.body;
            const result = await this.rolesService.assignPermissions(parseInt(req.params.id), permissionIds);
            ResponseUtil.sendResponse(res, AppMessages.Success.Role.UPDATED, result);
        } catch (error) {
            next(error);
        }
    }

    getPermissions = async (req, res, next) => {
        try {
            const result = await this.rolesService.getPermissions(parseInt(req.params.id));
            ResponseUtil.sendResponse(res, AppMessages.Success.Role.RETRIEVED, result);
        } catch (error) {
            next(error);
        }
    }

    remove = async (req, res, next) => {
        try {
            await this.rolesService.remove(parseInt(req.params.id));
            ResponseUtil.sendResponse(res, AppMessages.Success.Role.DELETED, null);
        } catch (error) {
            next(error);
        }
    }
}
