import { AppDataSource } from '../database/data-source.js';
import { OvertimeTypeEntity } from '../models/entities/overtime-type.entity.js';
import { ResponseUtil } from '../common/utils/response.util.js';

/**
 * GET /overtime-types — trả về danh sách loại OT đã seed sẵn
 * Không có CRUD, chỉ đọc
 */
export class OvertimeTypesController {
    constructor() {
        this.repository = AppDataSource.getRepository(OvertimeTypeEntity);
    }

    findAll = async (req, res, next) => {
        try {
            const types = await this.repository.find({
                where: { isDeleted: false },
                order: { id: 'ASC' },
            });
            ResponseUtil.sendResponse(res, 'Lấy danh sách loại OT thành công', types);
        } catch (error) {
            next(error);
        }
    };
}
