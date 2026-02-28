import { UsersService } from '../services/users.service.js';
import { plainToInstance } from 'class-transformer';
import { UserResponseDto } from '../models/dto/users/user-response.dto.js';
import { ResponseUtil } from '../common/utils/response.util.js';
import { AppMessages } from '../common/constants/index.js';
import { SearchUserDto } from '../models/dto/users/search-user.dto.js';

export class UsersController {
  constructor() {
    this.usersService = new UsersService();
  }

  create = async (req, res, next) => {
    try {
      const result = await this.usersService.create(req.body);
      ResponseUtil.sendResponse(
        res,
        AppMessages.Success.User.CREATED,
        result,
        201,
      );
    } catch (error) {
      next(error);
    }
  };

  findAll = async (req, res, next) => {
    try {
      // Extract pagination params from query
      const paginationDto = plainToInstance(SearchUserDto, req.query);

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
  };

  getMetadata = async (req, res, next) => {
    try {
      const metadata = await this.usersService.getMetadata();
      ResponseUtil.sendResponse(
        res,
        AppMessages.Success.General?.RETRIEVED || 'Data retrieved successfully',
        metadata,
      );
    } catch (error) {
      next(error);
    }
  };

  findOne = async (req, res, next) => {
    try {
      const result = await this.usersService.findById(parseInt(req.params.id));
      const data = plainToInstance(UserResponseDto, result);
      ResponseUtil.sendResponse(res, AppMessages.Success.User.RETRIEVED, data);
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const result = await this.usersService.update(
        parseInt(req.params.id),
        req.body,
      );
      ResponseUtil.sendResponse(res, AppMessages.Success.User.UPDATED, result);
    } catch (error) {
      next(error);
    }
  };

  remove = async (req, res, next) => {
    try {
      const currentUserId = req.user.id; // From auth middleware
      await this.usersService.remove(parseInt(req.params.id), currentUserId);
      ResponseUtil.sendResponse(res, AppMessages.Success.User.DELETED, null);
    } catch (error) {
      next(error);
    }
  };

  lockUser = async (req, res, next) => {
    try {
      const currentUserId = req.user.id; // From auth middleware
      await this.usersService.lockUser(parseInt(req.params.id), currentUserId);
      ResponseUtil.sendResponse(res, 'Tài khoản người dùng đã được khóa thành công', null);
    } catch (error) {
      next(error);
    }
  };

  unlockUser = async (req, res, next) => {
    try {
      await this.usersService.unlockUser(parseInt(req.params.id));
      ResponseUtil.sendResponse(
        res,
        'Tài khoản người dùng đã được mở khóa thành công',
        null,
      );
    } catch (error) {
      next(error);
    }
  };

  removeUserRoles = async (req, res, next) => {
    try {
      const currentUserId = req.user.id;
      const userId = parseInt(req.params.id);
      await this.usersService.removeUserRoles(userId, currentUserId);
      ResponseUtil.sendResponse(res, 'Xóa vai trò thành công', null);
    } catch (error) {
      next(error);
    }
  };

  resetPassword = async (req, res, next) => {
    try {
      const currentUserId = req.user.id;
      const userId = parseInt(req.params.id);
      await this.usersService.resetPassword(userId, currentUserId);
      ResponseUtil.sendResponse(
        res,
        'Mật khẩu người dùng đã được yêu cầu đặt lại thành công',
        null,
      );
    } catch (error) {
      next(error);
    }
  };
}
