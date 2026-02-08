import { EmployeeSalariesService } from '../services/employee-salaries.service.js';
import { AppMessages } from '../common/constants/index.js';

export class EmployeeSalariesController {
    constructor() {
        this.employeeSalariesService = new EmployeeSalariesService();
    }

    findAll = async (req, res, next) => {
        try {
            const data = await this.employeeSalariesService.findAll();
            res.json({
                success: true,
                data,
                message: AppMessages.SUCCESS,
            });
        } catch (error) {
            next(error);
        }
    };

    async findByEmployeeId(req, res, next) {
        try {
            const { employeeId } = req.params;
            const result = await this.employeeSalariesService.findByEmployeeId(employeeId);
            res.status(200).json({
            success: true,
            data: result
            });
        } catch (error) {
            next(error);
        }
    }
}
