import { BaseResponseDto } from '../common/dto/index.js';
import { HolidayListService } from '../services/holiday-list.service.js';

export class HolidayListController {
    constructor() {
        this.service = new HolidayListService();
    }

    async findAll(req, res, next) {
        try {
            const queryDto = {
                skip: parseInt(req.query.skip) || 0,
                limit: parseInt(req.query.limit) || 10,
                sortBy: req.query.sortBy || 'startDate',
                sortOrder: req.query.sortOrder || 'ASC',
                search: req.query.search,
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                holidayGroupId: req.query.holidayGroupId ? parseInt(req.query.holidayGroupId) : undefined,
                holidayType: req.query.holidayType,
            };
            const result = await this.service.findAll(queryDto);
            res.status(200).json({
                success: true,
                ...result,
            });
        } catch (error) {
            next(error);
        }
    }

    async findById(req, res, next) {
        try {
            const result = await this.service.findById(req.params.id);
            res.json(new BaseResponseDto(result, 'Holiday fetched successfully'));
        } catch (error) {
            next(error);
        }
    }

    async create(req, res, next) {
        try {
            const data = { ...req.body, updatedBy: req.user?.username || 'System' };
            const result = await this.service.create(data);
            res.status(201).json(new BaseResponseDto(result, 'Holiday created successfully'));
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const data = { ...req.body, updatedBy: req.user?.username || 'System' };
            const result = await this.service.update(req.params.id, data);
            res.json(new BaseResponseDto(result, 'Holiday updated successfully'));
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            const result = await this.service.delete(req.params.id);
            res.json(new BaseResponseDto(result, 'Holiday deleted successfully'));
        } catch (error) {
            next(error);
        }
    }

    async export(req, res, next) {
        try {
            const queryDto = {
                search: req.query.search,
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                holidayGroupId: req.query.holidayGroupId ? parseInt(req.query.holidayGroupId) : undefined,
                holidayType: req.query.holidayType,
            };
            const buffer = await this.service.export(queryDto);

            res.setHeader(
                'Content-Type',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            );
            res.setHeader(
                'Content-Disposition',
                'attachment; filename=danh-sach-ngay-le.xlsx'
            );
            res.send(buffer);
        } catch (error) {
            next(error);
        }
    }

    async getInheritPreview(req, res, next) {
        try {
            const year = parseInt(req.query.year) || new Date().getFullYear();
            const result = await this.service.getInheritPreview(year);
            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            next(error);
        }
    }

    async bulkCreate(req, res, next) {
        try {
            const result = await this.service.bulkCreate(req.body, req.user?.username || 'System');
            res.status(201).json(new BaseResponseDto(result, 'Holidays inherited successfully'));
        } catch (error) {
            next(error);
        }
    }

    async sendNotification(req, res, next) {
        try {
            const result = await this.service.sendNotification(req.body);
            res.status(200).json(new BaseResponseDto(result, 'Notifications processed successfully'));
        } catch (error) {
            next(error);
        }
    }
}
