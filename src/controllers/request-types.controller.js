import { RequestTypesService } from '../services/request-types.service.js';

export class RequestTypesController {
    constructor() {
        this.service = new RequestTypesService();
    }

    /**
     * @description Lấy danh sách Loại Đơn (UC-REQ-TYPE-05)
     */
    findAll = async (req, res, next) => {
        try {
            const { skip, take, search, status, requestGroupId } = req.query;
            const options = {
                skip: skip ? parseInt(skip, 10) : 0,
                take: take ? parseInt(take, 10) : 10,
                search,
                status,
                requestGroupId: requestGroupId ? parseInt(requestGroupId, 10) : undefined
            };

            const result = await this.service.findAll(options);
            res.status(200).json(result);
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
