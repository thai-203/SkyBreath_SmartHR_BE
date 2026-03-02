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
            const result = await this.service.create(req.body);
            res.status(201).json(new BaseResponseDto(result, 'Holiday created successfully'));
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const result = await this.service.update(req.params.id, req.body);
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
}
