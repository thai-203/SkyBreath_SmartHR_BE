import { RequestTypesService } from '../services/request-types.service.js';
import { plainToInstance } from 'class-transformer';
import { SearchRequestTypeDto } from '../models/dto/request-types/search-request-type.dto.js';
import { ResponseUtil } from '../common/utils/response.util.js';
import { AppMessages } from '../common/constants/index.js';

export class RequestTypesController {
    constructor() {
        this.service = new RequestTypesService();
    }

    /**
     * @description Lấy danh sách Loại Đơn (UC-REQ-TYPE-05)
     */
    findAll = async (req, res, next) => {
        try {
            const paginationDto = plainToInstance(SearchRequestTypeDto, req.query, { enableImplicitConversion: true });
            const result = await this.service.findAll(paginationDto);
            ResponseUtil.sendResponse(res, 'Lấy danh sách thành công', result);
        } catch (error) {
            next(error);
        }
    };

    /**
     * @description Lấy chi tiết Loại Đơn (UC-REQ-TYPE-04)
     */
    findById = async (req, res, next) => {
        try {
            const { id } = req.params;
            const typeItem = await this.service.findById(parseInt(id, 10));
            res.status(200).json(typeItem);
        } catch (error) {
            next(error);
        }
    };

    /**
     * @description Tạo Loại đơn kèm Policy (UC-REQ-TYPE-01 & UC-REQ-TYPE-07)
     */
    create = async (req, res, next) => {
        try {
            const typeItem = await this.service.create(req.body);
            res.status(201).json(typeItem);
        } catch (error) {
            next(error);
        }
    };

    /**
     * @description Cập nhật Loại Đơn và Policy (UC-REQ-TYPE-02)
     */
    update = async (req, res, next) => {
        try {
            const { id } = req.params;
            const typeItem = await this.service.update(parseInt(id, 10), req.body);
            res.status(200).json(typeItem);
        } catch (error) {
            next(error);
        }
    };

    /**
     * @description Cập nhật Policy của Loại Đơn (UC-REQ-TYPE-07)
     */
    updatePolicy = async (req, res, next) => {
        try {
            const { id } = req.params;
            const typeItem = await this.service.updatePolicy(parseInt(id, 10), req.body);
            res.status(200).json(typeItem);
        } catch (error) {
            next(error);
        }
    };

    /**
     * @description Xóa loại đơn (UC-REQ-TYPE-03)
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
}
