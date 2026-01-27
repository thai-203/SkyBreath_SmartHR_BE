import { Request, Response, NextFunction } from 'express';
import { RolesService } from '../services/roles.service';
import { ResponseUtil } from '../common/utils/response.util';
import { AppMessages } from '../common/constants';

export class RolesController {
    constructor(private readonly rolesService: RolesService) { }

    create = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.rolesService.create(req.body);
            ResponseUtil.sendResponse(res, AppMessages.Success.Role.CREATED, result, 201);
        } catch (error) {
            next(error);
        }
    }

    findAll = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.rolesService.findAll();
            ResponseUtil.sendResponse(res, AppMessages.Success.Role.RETRIEVED_ALL, result);
        } catch (error) {
            next(error);
        }
    }

    findOne = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.rolesService.findById(parseInt(req.params.id as string));
            ResponseUtil.sendResponse(res, AppMessages.Success.Role.RETRIEVED, result);
        } catch (error) {
            next(error);
        }
    }

    update = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.rolesService.update(parseInt(req.params.id as string), req.body);
            ResponseUtil.sendResponse(res, AppMessages.Success.Role.UPDATED, result);
        } catch (error) {
            next(error);
        }
    }

    remove = async (req: Request, res: Response, next: NextFunction) => {
        try {
            await this.rolesService.remove(parseInt(req.params.id as string));
            ResponseUtil.sendResponse(res, AppMessages.Success.Role.DELETED, null);
        } catch (error) {
            next(error);
        }
    }
}
