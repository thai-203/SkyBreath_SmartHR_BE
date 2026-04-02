import { RequestGroupsService } from '../services/request-groups.service.js';
import { plainToInstance } from 'class-transformer';
import { SearchRequestGroupDto } from '../models/dto/request-groups/search-request-group.dto.js';
import { ResponseUtil } from '../common/utils/response.util.js';
import { AppMessages } from '../common/constants/index.js';

export class RequestGroupsController {
    constructor() {
        this.service = new RequestGroupsService();
    }

    /**
     * @description Gọi API Fetch danh sách nhóm đơn
     */
    findAll = async (req, res, next) => {
        try {
            const paginationDto = plainToInstance(SearchRequestGroupDto, req.query, { enableImplicitConversion: true });
            const result = await this.service.findAll(paginationDto);
            ResponseUtil.sendResponse(res, 'Lấy danh sách thành công', result);
        } catch (error) {
            console.error('[RequestGroupsController.findAll] Error:', error);
            next(error);
        }
    };

    /**
     * @description Gọi API xem chi tiết 1 nhóm đơn
     */
    findById = async (req, res, next) => {
        try {
            const { id } = req.params;
            const group = await this.service.findById(parseInt(id, 10));
            res.status(200).json(group);
        } catch (error) {
            next(error);
        }
    };

    /**
     * @description Gọi API tạo nhóm đơn mới
     */
    create = async (req, res, next) => {
        try {
            const group = await this.service.create(req.body);
            res.status(201).json(group);
        } catch (error) {
            next(error);
        }
    };

    /**
     * @description Gọi API chỉnh sửa thông tin hoặc cấu hình duyệt của 1 nhóm đơn
     */
    update = async (req, res, next) => {
        try {
            const { id } = req.params;
            const group = await this.service.update(parseInt(id, 10), req.body);
            res.status(200).json(group);
        } catch (error) {
            next(error);
        }
    };

    /**
     * @description Gọi API xóa nhóm đơn (sẽ throw error nếu có loại đơn bên trong)
     */
    remove = async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await this.service.remove(parseInt(id, 10));
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };

    /**
     * @description Gọi API khôi phục nhóm đơn đã xóa mềm
     */
    restore = async (req, res, next) => {
        try {
            const { id } = req.params;
            const result = await this.service.restore(parseInt(id, 10));
            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };
}
