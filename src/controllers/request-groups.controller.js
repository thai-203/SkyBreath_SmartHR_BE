import { RequestGroupsService } from '../services/request-groups.service.js';

export class RequestGroupsController {
    constructor() {
        this.service = new RequestGroupsService();
    }

    /**
     * @description Gọi API Fetch danh sách nhóm đơn
     */
    findAll = async (req, res, next) => {
        try {
            const { skip, take, search, status } = req.query;
            const options = {
                skip: skip ? parseInt(skip, 10) : 0,
                take: take ? parseInt(take, 10) : 10,
                search,
                status,
            };

            const result = await this.service.findAll(options);
            res.status(200).json(result);
        } catch (error) {
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
}
