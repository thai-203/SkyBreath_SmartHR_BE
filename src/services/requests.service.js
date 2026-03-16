import { AppDataSource } from '../database/data-source.js';
import { EmployeeEntity } from '../models/entities/employee.entity.js';

export class RequestsService {
    constructor(requestsRepository) {
        this.requestsRepository = requestsRepository;
    }

    async getLeaveCalendar(queryDto, userContext) {
        const { month, year, employeeId: filterEmployeeId } = queryDto;
        
        // If user is employee, they only see their own leave schedule
        // Unless we want them to see everyone's? 
        // Typically, employees see their own, but the request might imply seeing the team's?
        // Let's check roles. Managers/HR see all. Employees see their own for now.
        
        let targetEmployeeId = filterEmployeeId;
        
        if (userContext) {
            const roles = userContext.roles || [];
            const isManagement = roles.includes('ADMIN') || roles.includes('HR') || roles.includes('MANAGER');
            
            if (!isManagement) {
                const employee = await this._getEmployeeByUserId(userContext.id);
                if (!employee) return [];
                targetEmployeeId = employee.id;
            }
        }

        const leaves = await this.requestsRepository.findLeavesByMonth(
            parseInt(month),
            parseInt(year),
            targetEmployeeId
        );

        return leaves.map(l => ({
            id: l.id,
            employeeId: l.employeeId,
            employeeName: l.employee?.fullName,
            employeeCode: l.employee?.employeeCode,
            leaveType: l.leaveType?.leaveTypeName,
            startDate: l.startDate,
            endDate: l.endDate,
            status: l.requestStatus,
            content: l.requestContent
        }));
    }

    _isEmployee(userContext) {
        const roles = userContext.roles || [];
        return roles.includes('EMPLOYEE') && !roles.includes('ADMIN') && !roles.includes('HR');
    }

    async _getEmployeeByUserId(userId) {
        return AppDataSource.getRepository(EmployeeEntity).findOne({
            where: { userId, isDeleted: false },
        });
    }
}
