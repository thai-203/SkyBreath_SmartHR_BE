import { ResponseUtil } from '../common/utils/response.util.js';
import { AppMessages } from '../common/constants/index.js';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateEmployeeDto,
  UpdateEmployeeDto,
  EmployeeQueryDto,
} from '../models/dto/employees/index.js';

export class EmployeesController {
  constructor(employeesService) {
    this.employeesService = employeesService;
  }

  create = async (req, res, next) => {
    try {
      const createDto = plainToInstance(CreateEmployeeDto, req.body);

      // Validate
      const errors = await validate(createDto);
      if (errors.length > 0) {
        const message = Object.values(errors[0].constraints)[0];
        return ResponseUtil.sendResponse(res, message, null, 400);
      }

      // Handle uploaded files
      if (req.files) {
        if (req.files['frontIdCard']) {
          createDto.frontIdCardFilePath = req.files[
            'frontIdCard'
          ][0].path.replace(/\\/g, '/');
        }
        if (req.files['backIdCard']) {
          createDto.backIdCardFilePath = req.files[
            'backIdCard'
          ][0].path.replace(/\\/g, '/');
        }
      }

      const result = await this.employeesService.create(createDto);
      ResponseUtil.sendResponse(
        res,
        AppMessages.Success.Employee.CREATED,
        result,
      );
    } catch (error) {
      next(error);
    }
  };

  all = async (req, res, next) => {
    try {
      const queryDto = plainToInstance(EmployeeQueryDto, req.query);
      console.log('debug employees all queryDto:', queryDto, 'skip:', queryDto.skip);
      const result = await this.employeesService.findAll(queryDto);
      ResponseUtil.sendResponse(
        res,
        AppMessages.Success.Employee.RETRIEVED_ALL,
        result,
      );
    } catch (error) {
      console.error('Error:', error);
      if(error.query) console.error('SQL Query:', error.query);
      next(error);
    }
  };

  findOne = async (req, res, next) => {
    try {
      const employee = await this.employeesService.findById(
        parseInt(req.params.id),
      );
      ResponseUtil.sendResponse(
        res,
        AppMessages.Success.Employee.RETRIEVED,
        employee,
      );
    } catch (error) {
      next(error);
    }
  };

  getMetadata = async (req, res, next) => {
    try {
      const metadata = await this.employeesService.getMetadata();
      ResponseUtil.sendResponse(
        res,
        AppMessages.Success.General?.RETRIEVED || 'Data retrieved successfully',
        metadata,
      );
    } catch (error) {
      next(error);
    }
  };

  list = async (req, res, next) => {
    try {
      const noContract = req.query.noContract === 'true';
      const list = await this.employeesService.getDropdownList(
        null,
        noContract,
      );
      ResponseUtil.sendResponse(
        res,
        AppMessages.Success.Employee.RETRIEVED_ALL,
        list,
      );
    } catch (error) {
      next(error);
    }
  };

  update = async (req, res, next) => {
    try {
      const updateDto = plainToInstance(UpdateEmployeeDto, req.body, {
        excludeExtraneousValues: true,
      });

      // Handle uploaded files
      if (req.files) {
        if (req.files['frontIdCard']) {
          updateDto.frontIdCardFilePath = req.files[
            'frontIdCard'
          ][0].path.replace(/\\/g, '/');
        }
        if (req.files['backIdCard']) {
          updateDto.backIdCardFilePath = req.files[
            'backIdCard'
          ][0].path.replace(/\\/g, '/');
        }
      }

      // Validate
      const errors = await validate(updateDto);
      if (errors.length > 0) {
        const message = Object.values(errors[0].constraints)[0];
        return ResponseUtil.sendResponse(res, message, null, 400);
      }

      const result = await this.employeesService.update(
        parseInt(req.params.id),
        updateDto,
      );
      ResponseUtil.sendResponse(
        res,
        AppMessages.Success.Employee.UPDATED,
        result,
      );
    } catch (error) {
      next(error);
    }
  };

  delete = async (req, res, next) => {
    try {
      await this.employeesService.delete(parseInt(req.params.id));
      ResponseUtil.sendResponse(res, AppMessages.Success.Employee.DELETED);
    } catch (error) {
      next(error);
    }
  };

  getValidationData = async (req, res, next) => {
    try {
      const data = await this.employeesService.findValidationData();
      ResponseUtil.sendResponse(
        res,
        AppMessages.Success.General?.RETRIEVED || 'Data retrieved successfully',
        data,
      );
    } catch (error) {
      next(error);
    }
  };

  export = async (req, res, next) => {
    try {
      const buffer = await this.employeesService.exportExcel();
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        'attachment; filename=employees.xlsx',
      );
      res.setHeader('Content-Length', buffer.length);
      res.end(buffer);
    } catch (error) {
      next(error);
    }
  };

  getEmployeeNoPlanId = async (req, res, next) => {
    try {
      const result = await this.employeesService.getEmployeeNoPlanId();
      ResponseUtil.sendResponse(
        res,
        AppMessages.Success.Employee.RETRIEVED_ALL,
        result,
      );
    } catch (error) {
      next(error);
    }
  };

  getByUserId = async (req, res, next) => {
    try {
      const userId = parseInt(req.params.userId);
      const employee = await this.employeesService.getByUserId(userId);
      if (!employee) {
        return ResponseUtil.sendResponse(
          res,
          AppMessages.Errors.Employee?.NOT_FOUND?.message ||
            'Employee not found',
          null,
          404,
        );
      }
      ResponseUtil.sendResponse(
        res,
        AppMessages.Success.Employee.RETRIEVED,
        employee,
      );
    } catch (error) {
      next(error);
    }
  };
}
