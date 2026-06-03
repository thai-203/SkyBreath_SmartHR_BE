import { AppDataSource } from '../database/data-source.js';
import { DepartmentTransferEntity } from '../models/entities/department-transfer.entity.js';
import { DepartmentTransferDetailEntity } from '../models/entities/department-transfer-detail.entity.js';

export class DepartmentTransfersRepository {
    constructor() {
        this.repository = AppDataSource.getRepository(DepartmentTransferEntity);
        this.detailRepository = AppDataSource.getRepository(DepartmentTransferDetailEntity);
    }

    async findAll(queryDto) {
        const { skip, limit, fromDepartmentId, toDepartmentId, search } = queryDto;

        const query = this.repository.createQueryBuilder('transfer')
            .leftJoinAndSelect('transfer.fromDepartment', 'fromDepartment')
            .leftJoinAndSelect('transfer.toDepartment', 'toDepartment')
            .leftJoinAndSelect('transfer.transferredByUser', 'transferredByUser')
            .where('transfer.isDeleted = :isDeleted', { isDeleted: false });

        if (fromDepartmentId) {
            query.andWhere('transfer.fromDepartmentId = :fromDepartmentId', { fromDepartmentId });
        }

        if (toDepartmentId) {
            query.andWhere('transfer.toDepartmentId = :toDepartmentId', { toDepartmentId });
        }

        if (search) {
            query.andWhere('(transfer.transferCode LIKE :search OR transfer.reason LIKE :search)', { search: `%${search}%` });
        }

        query.orderBy('transfer.createdAt', 'DESC');

        const [items, total] = await query
            .skip(skip)
            .take(limit)
            .getManyAndCount();

        return [items, total];
    }

    async findById(id) {
        return this.repository.findOne({
            where: { id, isDeleted: false },
            relations: [
                'fromDepartment',
                'toDepartment',
                'transferredByUser',
                'details',
                'details.employee',
                'details.employee.position'
            ],
        });
    }

    async countTodayTransfers() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return this.repository.createQueryBuilder('transfer')
            .where('transfer.createdAt >= :today', { today })
            .andWhere('transfer.createdAt < :tomorrow', { tomorrow })
            .getCount();
    }
}
