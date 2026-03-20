import { BaseResponseDto } from '../common/dto/index.js';
import { HolidayGroupService } from '../services/holiday-groups.service.js';

export class HolidayGroupController {
    constructor() {
        this.service = new HolidayGroupService();
    }

    async findAll(req, res, next) {
        try {
            const result = await this.service.findAll(req.query);
            res.json(new BaseResponseDto(result, 'Holiday groups fetched successfully'));
        } catch (error) {
            next(error);
        }
    }

    async findById(req, res, next) {
        try {
            const result = await this.service.findById(req.params.id);
            res.json(new BaseResponseDto(result, 'Holiday group fetched successfully'));
        } catch (error) {
            next(error);
        }
    }

    async create(req, res, next) {
        try {
            const result = await this.service.create(req.body);
            res.status(201).json(new BaseResponseDto(result, 'Holiday group created successfully'));
        } catch (error) {
            next(error);
        }
    }

    async update(req, res, next) {
        try {
            const result = await this.service.update(req.params.id, req.body);
            res.json(new BaseResponseDto(result, 'Holiday group updated successfully'));
        } catch (error) {
            next(error);
        }
    }

    async delete(req, res, next) {
        try {
            const result = await this.service.delete(req.params.id);
            res.json(new BaseResponseDto(result, 'Holiday group deleted successfully'));
        } catch (error) {
            next(error);
        }
    }

    async inherit(req, res, next) {
        try {
            const { targetYear } = req.body;
            if (!targetYear) {
                return res.status(400).json(new BaseResponseDto(null, 'Target year is required', false));
            }
            const result = await this.service.inheritForNextYear(req.params.id, targetYear);
            res.json(new BaseResponseDto(result, 'Holiday group inherited successfully'));
        } catch (error) {
            next(error);
        }
    }
}
