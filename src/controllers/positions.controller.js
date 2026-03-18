import { PositionsService } from '../services/positions.service.js';
import { AppMessages } from '../common/constants/index.js';

export class PositionsController {
    constructor() {
        this.positionsService = new PositionsService();
    }

    findAll = async (req, res, next) => {
        try {
            const data = await this.positionsService.findAll();
            res.json({
                success: true,
                data,
                message: AppMessages.SUCCESS,
            });
        } catch (error) {
            next(error);
        }
    };

    findList = async (req, res, next) => {
        try {
            const data = await this.positionsService.findList();
            res.json({
                success: true,
                data,
                message: AppMessages.SUCCESS,
            });
        } catch (error) {
            next(error);
        }
    };

    findById = async (req, res, next) => {
        try {
            const data = await this.positionsService.findById(req.params.id);
            res.json({
                success: true,
                data,
                message: AppMessages.SUCCESS,
            });
        } catch (error) {
            next(error);
        }
    };

    create = async (req, res, next) => {
        try {
            const data = await this.positionsService.create(req.body);
            res.status(201).json({
                success: true,
                data,
                message: AppMessages.SUCCESS,
            });
        } catch (error) {
            next(error);
        }
    };

    update = async (req, res, next) => {
        try {
            const data = await this.positionsService.update(req.params.id, req.body);
            res.json({
                success: true,
                data,
                message: AppMessages.SUCCESS,
            });
        } catch (error) {
            next(error);
        }
    };

    remove = async (req, res, next) => {
        try {
            await this.positionsService.remove(req.params.id);
            res.json({
                success: true,
                message: AppMessages.SUCCESS,
            });
        } catch (error) {
            next(error);
        }
    };

    exportExcel = async (req, res, next) => {
        res.status(501).json({ message: 'Not implemented' });
    };
}
