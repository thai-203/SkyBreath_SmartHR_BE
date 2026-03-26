import { AppDataSource } from '../database/data-source.js';
import { RequestEntity } from '../models/entities/request.entity.js';
import { Between, LessThanOrEqual, MoreThanOrEqual, In } from 'typeorm';

export class RequestsRepository {
    constructor() {
        this.repository = AppDataSource.getRepository(RequestEntity);
    }

    async findLeavesByMonth(month, year, employeeId = null) {
        const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
        const endDate = new Date(year, month, 0).toISOString().split('T')[0];

        const query = this.repository.createQueryBuilder('request')
            .leftJoinAndSelect('request.employee', 'employee')
            .leftJoinAndSelect('request.leaveType', 'leaveType')
            .where('request.isDeleted = :isDeleted', { isDeleted: false })
            .andWhere('request.requestType = :requestType', { requestType: 'LEAVE' })
            .andWhere('request.requestStatus IN (:...statuses)', { statuses: ['APPROVED', 'PENDING'] })
            .andWhere('(request.startDate <= :endDate AND request.endDate >= :startDate)', {
                startDate,
                endDate
            });

        if (employeeId) {
            query.andWhere('request.employeeId = :employeeId', { employeeId });
        }

        return query.getMany();
    }

    async findApprovedOtRequests(month, year, employeeId) {
        const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
        const endDate = new Date(year, month, 0).toISOString().split('T')[0];

        const query = this.repository.createQueryBuilder('request')
            .where('request.isDeleted = :isDeleted', { isDeleted: false })
            .andWhere('request.requestType = :requestType', { requestType: 'OVERTIME' })
            .andWhere('request.requestStatus = :status', { status: 'APPROVED' })
            .andWhere('(request.startDate <= :endDate AND request.endDate >= :startDate)', {
                startDate,
                endDate
            });

        if (employeeId) {
            query.andWhere('request.employeeId = :employeeId', { employeeId });
        }

        return query.getMany();
    }
}
