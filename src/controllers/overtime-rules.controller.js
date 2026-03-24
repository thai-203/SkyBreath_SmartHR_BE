import { OvertimeRulesService } from '../services/overtime-rules.service.js';
import { ResponseUtil } from '../common/utils/response.util.js';

export class OvertimeRulesController {
    constructor() {
        this.overtimeRulesService = new OvertimeRulesService();
    }

    findAll = async (req, res, next) => {
        try {
            const {
                search, versionStatus, overtimeTypeId, departmentId,
                minMultiplier, maxMultiplier,
                minHoursPerDay, maxHoursPerDay,
                minHoursPerMonth, maxHoursPerMonth,
                page = 1, limit = 10,
            } = req.query;

            const pageNum = Math.max(1, parseInt(page));
            const limitNum = Math.max(1, parseInt(limit));
            const skip = (pageNum - 1) * limitNum;

            const options = { skip, take: limitNum };

            if (search) options.search = search;
            if (versionStatus) options.versionStatus = versionStatus;
            if (overtimeTypeId) options.overtimeTypeId = parseInt(overtimeTypeId);
            if (departmentId) options.departmentId = parseInt(departmentId);
            if (minMultiplier) options.minMultiplier = parseFloat(minMultiplier);
            if (maxMultiplier) options.maxMultiplier = parseFloat(maxMultiplier);
            if (minHoursPerDay) options.minHoursPerDay = parseInt(minHoursPerDay);
            if (maxHoursPerDay) options.maxHoursPerDay = parseInt(maxHoursPerDay);
            if (minHoursPerMonth) options.minHoursPerMonth = parseInt(minHoursPerMonth);
            if (maxHoursPerMonth) options.maxHoursPerMonth = parseInt(maxHoursPerMonth);

            const { items, total } = await this.overtimeRulesService.findAll(options);

            ResponseUtil.sendResponse(res, 'Lấy danh sách quy định OT thành công', {
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
            const data = await this.overtimeRulesService.findById(req.params.id);
            ResponseUtil.sendResponse(res, 'Lấy chi tiết quy định OT thành công', data);
        } catch (error) {
            next(error);
        }
    };

    create = async (req, res, next) => {
        try {
            const data = await this.overtimeRulesService.create(req.body);
            ResponseUtil.sendResponse(res, 'Tạo quy định OT thành công', data, 201);
        } catch (error) {
            next(error);
        }
    };

    update = async (req, res, next) => {
        try {
            const data = await this.overtimeRulesService.update(req.params.id, req.body);
            ResponseUtil.sendResponse(res, 'Cập nhật quy định OT thành công', data);
        } catch (error) {
            next(error);
        }
    };

    /**
     * PATCH /overtime-rules/:id/activate
     * Kích hoạt policy DRAFT → ACTIVE, tự EXPIRE policy ACTIVE cùng type
     */
    activate = async (req, res, next) => {
        try {
            const data = await this.overtimeRulesService.activate(req.params.id);
            ResponseUtil.sendResponse(res, 'Kích hoạt quy định OT thành công', data);
        } catch (error) {
            next(error);
        }
    };

    remove = async (req, res, next) => {
        try {
            await this.overtimeRulesService.remove(req.params.id);
            ResponseUtil.sendResponse(res, 'Xóa quy định OT thành công');
        } catch (error) {
            next(error);
        }
    };
}
