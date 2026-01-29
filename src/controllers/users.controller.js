import { UsersService } from '../services/users.service.js';
import { plainToInstance } from 'class-transformer';
import { UserResponseDto } from '../models/dto/users/user-response.dto.js';
import { ResponseUtil } from '../common/utils/response.util.js';
import { AppMessages } from '../common/constants/index.js';

export class UsersController {
    constructor() {
        this.usersService = new UsersService();
    }

    create = async (req, res, next) => {
        try {
            const result = await this.usersService.create(req.body);
            ResponseUtil.sendResponse(res, AppMessages.Success.User.CREATED, result, 201);
        } catch (error) {
            next(error);
        }
    }

    findAll = async (req, res, next) => {
        try {
            // Extract pagination params from query
            const paginationDto = {
                page: req.query.page ? parseInt(req.query.page) : 1,
                limit: req.query.limit ? parseInt(req.query.limit) : 10,
                sortBy: req.query.sortBy,
                sortOrder: req.query.sortOrder,
                search: req.query.search,
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

    findOne = async (req, res, next) => {
        try {
            const result = await this.usersService.findById(parseInt(req.params.id));
            const data = plainToInstance(UserResponseDto, result);
            ResponseUtil.sendResponse(res, AppMessages.Success.User.RETRIEVED, data);
        } catch (error) {
            next(error);
        }
    }

    update = async (req, res, next) => {
        try {
            const result = await this.usersService.update(parseInt(req.params.id), req.body);
            ResponseUtil.sendResponse(res, AppMessages.Success.User.UPDATED, result);
        } catch (error) {
            next(error);
        }
    }

    remove = async (req, res, next) => {
        try {
            await this.usersService.remove(parseInt(req.params.id));
            ResponseUtil.sendResponse(res, AppMessages.Success.User.DELETED, null);
        } catch (error) {
            next(error);
        }
    }
}
