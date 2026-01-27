import { Request, Response, NextFunction } from 'express';
import { EmployeesService } from '../services/employees.service';

export class EmployeesController {
    private employeesService: EmployeesService;

    constructor() {
        this.employeesService = new EmployeesService();
    }

    list = async (req: Request, res: Response, next: NextFunction) => {
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
