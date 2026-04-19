import { ResponseUtil } from '../common/utils/response.util.js';
import { AppMessages } from '../common/constants/index.js';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { FaceDataService } from '../services/face-data.service.js';
import { FaceDataQueryDto } from '../models/dto/face-data/index.js';

export class FaceDataController {
  constructor() {
    this.faceDataService = new FaceDataService();
  }

  registerFace = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const files = req.files;

      const result = await this.faceDataService.registerFaces(userId, files);

      ResponseUtil.sendResponse(res, 'OK', result);
    } catch (error) {
      next(error);
    }
  };

  getRegisteredFaces = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const faces = await this.faceDataService.getPersonalFaceData(userId);

      const facesDto = faces?.map((face) => ({
        id: face.id,
        registeredAt: face.registeredAt,
        imageUrl: face.imageUrl,
      }));

      ResponseUtil.sendResponse(
        res,
        'Registered faces retrieved successfully',
        facesDto,
      );
    } catch (error) {
      next(error);
    }
  };

  getAllFaces = async (req, res, next) => {
    try {
      const queryDto = plainToInstance(FaceDataQueryDto, req.query);

      // Validate DTO
      const errors = await validate(queryDto);
      if (errors.length > 0) {
        const message = Object.values(errors[0].constraints)[0];
        return ResponseUtil.sendResponse(res, message, null, 400);
      }

      const result = await this.faceDataService.getAllFaces(queryDto);
      ResponseUtil.sendResponse(
        res,
        'All faces retrieved successfully',
        result,
      );
    } catch (error) {
      next(error);
    }
  };

  findOne = async (req, res, next) => {
    try {
      const data = await this.faceDataService.getFacesByEmployee(
        parseInt(req.params.id),
      );
      ResponseUtil.sendResponse(
        res,
        'Thông tin sinh trắc học của nhân viên đã được tải',
        data,
      );
    } catch (error) {
      next(error);
    }
  };

  deleteFace = async (req, res, next) => {
    try {
      if (!req.user?.roles?.includes('ADMIN')) {
        return ResponseUtil.sendResponse(res, 'Forbidden', null, 403);
      }

      const { id } = req.params;

      if (!id) {
        return ResponseUtil.sendResponse(res, 'Face id is required', null, 400);
      }

      await this.faceDataService.deleteFaceById(id);

      ResponseUtil.sendResponse(res, 'Face deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  deleteFacesByEmployee = async (req, res, next) => {
    try {
      if (!req.user?.roles?.includes('ADMIN')) {
        return ResponseUtil.sendResponse(res, 'Forbidden', null, 403);
      }

      const { employeeId } = req.params;

      if (!employeeId) {
        return ResponseUtil.sendResponse(
          res,
          'Employee id is required',
          null,
          400,
        );
      }

      await this.faceDataService.deleteEmployeeFaces(employeeId);

      ResponseUtil.sendResponse(
        res,
        'All faces of employee deleted successfully',
      );
    } catch (error) {
      next(error);
    }
  };
  getManagementMetaData = async (req, res, next) => {
    try {
      const result = await this.faceDataService.getManagementMetaData();
      ResponseUtil.sendResponse(res, 'Get Meta Data Successfully', result);
    } catch (error) {
      next(error);
    }
  };
}
