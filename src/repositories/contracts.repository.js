import { AppDataSource } from '../database/data-source.js';
import { ContractEntity } from '../models/entities/contract.entity.js';
import { Like } from 'typeorm';

export class ContractsRepository {
    constructor() {
        this.repository = AppDataSource.getRepository(ContractEntity);
    }

    async create(data) {
        const contract = this.repository.create(data);
        return this.repository.save(contract);
    }

    async findAll(queryDto) {
        const { skip, limit, sortBy, sortOrder, search, contractStatus, contractType } = queryDto;

        const order = {};
        if (sortBy) {
            order[sortBy] = sortOrder;
        } else {
            order.createdAt = 'DESC';
        }

        const where = {
            isDeleted: false,
        };

        if (search) {
            where.contractNumber = Like(`%${search}%`);
        }

        if (contractStatus) {
            where.contractStatus = contractStatus;
        }

        if (contractType) {
            where.contractType = contractType;
        }

        const [contracts, total] = await this.repository.findAndCount({
            where,
            relations: ['employee', 'employee.user', 'employee.department', 'employee.position'],
            order,
            skip,
            take: limit,
        });

        return [contracts, total];
    }

    async findById(id) {
        return this.repository.findOne({
            where: { id, isDeleted: false },
            relations: ['employee', 'employee.user', 'employee.department', 'employee.position'],
        });
    }

    async findByEmployeeId(employeeId) {
        return this.repository.find({
            where: { employeeId, isDeleted: false },
            relations: ['employee'],
            order: { startDate: 'DESC' },
        });
    }

    async update(id, data) {
        await this.repository.update(id, data);
        return this.findById(id);
    }

    async delete(id) {
        await this.repository.update(id, {
            isDeleted: true,
            deletedAt: new Date(),
        });
    }

    async findByContractNumber(contractNumber) {
        return this.repository.findOne({
            where: { contractNumber, isDeleted: false },
        });
    }

    async findByStatus(status) {
        return this.repository.find({
            where: { contractStatus: status, isDeleted: false },
            relations: ['employee'],
        });
    }

    async findExpiredContracts() {
        const today = new Date();
        return this.repository
            .createQueryBuilder('contract')
            .where('contract.endDate < :today', { today })
            .andWhere('contract.contractStatus = :status', { status: 'Active' })
            .andWhere('contract.isDeleted = :isDeleted', { isDeleted: false })
            .leftJoinAndSelect('contract.employee', 'employee')
            .orderBy('contract.endDate', 'ASC')
            .getMany();
    }

    async search(keyword) {
        return this.repository
            .createQueryBuilder('contract')
            .leftJoinAndSelect('contract.employee', 'employee')
            .where('contract.contractNumber LIKE :keyword', { keyword: `%${keyword}%` })
            .orWhere('employee.fullName LIKE :keyword', { keyword: `%${keyword}%` })
            .andWhere('contract.isDeleted = :isDeleted', { isDeleted: false })
            .orderBy('contract.startDate', 'DESC')
            .getMany();
    }
}
