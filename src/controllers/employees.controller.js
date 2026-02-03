import { ResponseUtil } from '../common/utils/response.util.js';
import { AppMessages } from '../common/constants/index.js';

export class EmployeesController {
    constructor(employeesService) {
        this.employeesService = employeesService;
    }

    all = async (req, res, next) => {
        try {
            const all = await this.employeesService.findAll();
            res.status(200).json({
                success: true,
                data: all,
            });
        } catch (error) {
            next(error);
        }
    };

    list = async (req, res, next) => {
        try {
            const { page = 1, limit = 10, search = '' } = req.query;
            const options = {
                skip: (parseInt(page) - 1) * parseInt(limit),
                take: parseInt(limit),
                search
            };
            const result = await this.employeesService.findAll(options);
            ResponseUtil.sendResponse(res, AppMessages.Success.Employee.RETRIEVED_ALL, result);
        } catch (error) {
            next(error);
        }
    };

    update = async (req, res, next) => {
        try {
            const result = await this.employeesService.update(parseInt(req.params.id), req.body);
            ResponseUtil.sendResponse(res, AppMessages.Success.Employee.UPDATED, result);
        } catch (error) {
            next(error);
        }
    };

    delete = async (req, res, next) => {
        try {
            await this.employeesService.delete(parseInt(req.params.id));
            ResponseUtil.sendResponse(res, AppMessages.Success.Employee.DELETED);
        } catch (error) {
            next(error);
        }
    };
}
