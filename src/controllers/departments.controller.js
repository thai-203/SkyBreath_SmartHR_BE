import { DepartmentsService } from '../services/departments.service.js';
import { CreateDepartmentDto, UpdateDepartmentDto, DepartmentQueryDto } from '../models/dto/departments/index.js';
import { plainToInstance } from 'class-transformer';
import { AppMessages } from '../common/constants/index.js';


export class DepartmentsController {
    //1, Khởi tạo controller 
    constructor() {
        this.departmentsService = new DepartmentsService();
    }
    //2,Giải thích từng method trong controller

    // Tạo phòng ban mới. (Nhận dữ liệu từ body, validate, gọi service để tạo và trả về kết quả)
    create = async (req, res, next) => {
        try {
            const createDto = plainToInstance(CreateDepartmentDto, req.body);
            const department = await this.departmentsService.create(createDto);
            res.status(201).json({
                success: true,
                data: department,
                message: AppMessages.Success.Department.CREATED,
            });
        } catch (error) {
            next(error);
        }
    };

    // Lấy danh sách phòng ban có phân trang, lọc và tìm kiếm. (Nhận các tham số query, gọi service để lấy dữ liệu và trả về kết quả.)
    findAll = async (req, res, next) => {
        try {
            const queryDto = plainToInstance(DepartmentQueryDto, req.query);
            const result = await this.departmentsService.findAll(queryDto);
            res.status(200).json({
                success: true,
                ...result,
            });
        } catch (error) {
            next(error);
        }
    };

    // Lấy chi tiết phòng ban theo ID. (Nhận ID từ params, gọi service để lấy dữ liệu và trả về kết quả.)
    findOne = async (req, res, next) => {
        try {
            const id = parseInt(req.params.id);
            const department = await this.departmentsService.findById(id);
            res.status(200).json({
                success: true,
                data: department,
            });
        } catch (error) {
            next(error);
        }
    };

    // Cập nhật thông tin phòng ban. (Nhận ID từ params và dữ liệu cập nhật từ body, validate, gọi service để cập nhật và trả về kết quả.)
    update = async (req, res, next) => {
        try {
            const id = parseInt(req.params.id);
            const updateDto = plainToInstance(UpdateDepartmentDto, req.body);
            const department = await this.departmentsService.update(id, updateDto);
            res.status(200).json({
                success: true,
                data: department,
                message: AppMessages.Success.Department.UPDATED,
            });
        } catch (error) {
            next(error);
        }
    };

    // Xóa phòng ban. (Nhận ID từ params, gọi service để xóa và trả về kết quả.)
    remove = async (req, res, next) => {
        try {
            const id = parseInt(req.params.id);
            await this.departmentsService.remove(id);
            res.status(200).json({
                success: true,
                message: AppMessages.Success.Department.DELETED,
            });
        } catch (error) {
            next(error);
        }
    };

    // Lấy sơ đồ tổ chức phòng ban dưới dạng cây phân cấp. (Gọi service để lấy dữ liệu và trả về kết quả.)
    getOrgChart = async (req, res, next) => {
        try {
            const chart = await this.departmentsService.getOrgChart();
            res.status(200).json({
                success: true,
                data: chart,
            });
        } catch (error) {
            next(error);
        }
    };

    // Xuất danh sách phòng ban ra file Excel. (Gọi service để lấy file, thiết lập header và trả về file cho client.)
    export = async (req, res, next) => {
        try {
            const buffer = await this.departmentsService.exportExcel();
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', 'attachment; filename=departments.xlsx');
            res.setHeader('Content-Length', buffer.length);
            res.end(buffer);
        } catch (error) {
            next(error);
        }
    };

    // Lấy danh sách phòng ban (không phân trang, không lọc) để dùng trong dropdown chọn phòng ban cha hoặc quản lý. (Gọi service để lấy dữ liệu và trả về kết quả.)
    list = async (req, res, next) => {
        try {
            const list = await this.departmentsService.findList();
            res.status(200).json({
                success: true,
                data: list,
            });
        } catch (error) {
            next(error);
        }
    };
}
