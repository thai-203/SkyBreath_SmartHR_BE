import { EmployeesService } from '../services/employees.service.js';

export class EmployeesController {
    constructor() {
        this.employeesService = new EmployeesService();
    }

    list = async (req, res, next) => {
        try {
            const list = await this.employeesService.findList();
            res.status(200).json({
                success: true,
                data: list,
            });
        } catch (error) {
            next(error);
        }
    };
}
