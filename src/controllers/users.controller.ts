import { Request, Response, NextFunction } from 'express';
import { UsersService } from '../services/users.service';
import { plainToInstance } from 'class-transformer';
import { UserResponseDto } from '../models/dto/users/user-response.dto';
import { ResponseUtil } from '../common/utils/response.util';
import { AppMessages } from '../common/constants';

export class UsersController {
    private usersService: UsersService;

    constructor() {
        this.usersService = new UsersService();
    }

    create = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.usersService.create(req.body);
            ResponseUtil.sendResponse(res, AppMessages.Success.User.CREATED, result, 201);
        } catch (error) {
            next(error);
        }
    }

    findAll = async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Extract pagination params from query
            const paginationDto: any = {
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
                sortBy: req.query.sortBy as string,
                sortOrder: req.query.sortOrder as 'ASC' | 'DESC',
                search: req.query.search as string,
            };
            // Calculate skip
            paginationDto.skip = (paginationDto.page - 1) * paginationDto.limit;

            const result = await this.usersService.findAll(paginationDto);

            // Transform to DTO
            const data = plainToInstance(UserResponseDto, result.data);

            ResponseUtil.sendResponse(res, AppMessages.Success.User.RETRIEVED_ALL, {
                ...result,
                data,
            });
        } catch (error) {
            next(error);
        }
    }

    findOne = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.usersService.findById(parseInt(req.params.id as string));
            const data = plainToInstance(UserResponseDto, result);
            ResponseUtil.sendResponse(res, AppMessages.Success.User.RETRIEVED, data);
        } catch (error) {
            next(error);
        }
    }

    update = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const result = await this.usersService.update(parseInt(req.params.id as string), req.body);
            ResponseUtil.sendResponse(res, AppMessages.Success.User.UPDATED, result);
        } catch (error) {
            next(error);
        }
    }

    remove = async (req: Request, res: Response, next: NextFunction) => {
        try {
            await this.usersService.remove(parseInt(req.params.id as string));
            ResponseUtil.sendResponse(res, AppMessages.Success.User.DELETED, null);
        } catch (error) {
            next(error);
        }
    }
}
