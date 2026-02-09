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
}
