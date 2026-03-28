import { PenaltiesService } from '../services/penalties.service.js';
import { ResponseUtil } from '../common/utils/response.util.js';

export class PenaltiesController {
    constructor() {
        this.penaltiesService = new PenaltiesService();
    }

    findAll = async (req, res, next) => {
        try {
            const {
                search, violationType, status,
                page = 1, limit = 10,
            } = req.query;

            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.max(1, parseInt(limit));
            const skip = (pageNum - 1) * limitNum;

            const options = { skip, take: limitNum };

            if (search) options.search = search;
            if (violationType) options.violationType = violationType;
            if (status) options.status = status;

            const { items, total } = await this.penaltiesService.findAll(options);

            ResponseUtil.sendResponse(res, 'Lấy danh sách quy định vi phạm thành công', {
                items,
                pagination: {
                    page: pageNum,
                    limit: limitNum,
                    total,
                    totalPages: Math.ceil(total / limitNum),
                },
            });
        } catch (error) {
            next(error);
        }
    };

    findById = async (req, res, next) => {
        try {
            const data = await this.penaltiesService.findById(req.params.id);
            ResponseUtil.sendResponse(res, 'Lấy chi tiết quy định vi phạm thành công', data);
        } catch (error) {
            next(error);
        }
    };

    create = async (req, res, next) => {
        try {
            const data = await this.penaltiesService.create(req.body);
            ResponseUtil.sendResponse(res, 'Tạo quy định vi phạm thành công', data, 201);
        } catch (error) {
            next(error);
        }
    };

    update = async (req, res, next) => {
        try {
            const data = await this.penaltiesService.update(req.params.id, req.body);
            ResponseUtil.sendResponse(res, 'Cập nhật quy định vi phạm thành công', data);
        } catch (error) {
            next(error);
        }
    };

    remove = async (req, res, next) => {
        try {
            await this.penaltiesService.remove(req.params.id);
            ResponseUtil.sendResponse(res, 'Xóa quy định vi phạm thành công');
        } catch (error) {
            next(error);
        }
    };
}
