import { AiConfigurationsService } from '../services/ai-configurations.service.js';
import { ResponseUtil } from '../common/utils/response.util.js';

export class AiConfigurationsController {
    constructor() {
        this.service = new AiConfigurationsService();
    }

    getAll = async (req, res, next) => {
        try {
            const configs = await this.service.getAll();
            return ResponseUtil.sendResponse(res, 'Lấy danh sách cấu hình AI thành công', configs);
        } catch (error) {
            next(error);
        }
    }

    create = async (req, res, next) => {
        try {
            const userId = req.user.id;
            const data = req.body;
            const config = await this.service.create(data, userId);
            return ResponseUtil.sendResponse(res, 'Tạo cấu hình AI thành công', config, 201);
        } catch (error) {
            next(error);
        }
    }

    update = async (req, res, next) => {
        try {
            const userId = req.user.id;
            const id = req.params.id;
            const data = req.body;
            const config = await this.service.update(id, data, userId);
            return ResponseUtil.sendResponse(res, 'Cập nhật cấu hình AI thành công', config);
        } catch (error) {
            next(error);
        }
    }

    delete = async (req, res, next) => {
        try {
            const id = req.params.id;
            await this.service.delete(id);
            return ResponseUtil.sendResponse(res, 'Xóa cấu hình AI thành công', null);
        } catch (error) {
            next(error);
        }
    }
}
