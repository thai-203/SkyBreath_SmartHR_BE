import { AppDataSource } from '../database/data-source.js';
import { RequestGroupEntity } from '../models/entities/request-group.entity.js';

export class RequestGroupsRepository {
    constructor() {
        this.repository = AppDataSource.getRepository(RequestGroupEntity);
    }

    async findAll(paginationDto = {}) {
        const { skip = 0, limit = 10, search, status } = paginationDto;

        const query = this.repository.createQueryBuilder('group')
            .leftJoinAndSelect('group.workflows', 'workflows')
            .leftJoinAndSelect('workflows.approverRole', 'approverRole')
            .leftJoinAndSelect('workflows.approverUser', 'approverUser')
            .where('group.isDeleted = :isDeleted', { isDeleted: false });

        if (search) {
            query.andWhere('group.name LIKE :search', { search: `%${search}%` });
        }

        if (status) {
            query.andWhere('group.status = :status', { status });
        }

        const [groups, total] = await query
            .orderBy('group.createdAt', 'DESC')
            .skip(skip)
            .take(limit)
            .getManyAndCount();

        return { items: groups, total };
    }

    async findById(id) {
        return await this.repository.findOne({
            where: { id, isDeleted: false },
            relations: ['workflows', 'workflows.approverRole', 'workflows.approverUser', 'requestTypes'],
        });
    }

    async findByCode(code, excludeId = null) {
        const query = this.repository.createQueryBuilder('group')
            .where('group.code = :code', { code })
            .andWhere('group.isDeleted = :isDeleted', { isDeleted: false });
        
        if (excludeId) {
            query.andWhere('group.id != :excludeId', { excludeId });
        }
        
        return await query.getOne();
    }

    async findByCodeWithDeleted(code) {
        return await this.repository.findOne({
            where: { code },
            withDeleted: true
        });
    }

    async findByName(name, excludeId = null) {
        const query = this.repository.createQueryBuilder('group')
            .where('group.name = :name', { name })
            .andWhere('group.isDeleted = :isDeleted', { isDeleted: false });
        
        if (excludeId) {
            query.andWhere('group.id != :excludeId', { excludeId });
        }
        
        return await query.getOne();
    }

    async create(data) {
        const group = this.repository.create(data);
        return await this.repository.save(group);
    }

    async update(id, data) {
        await this.repository.update(id, data);
        return await this.findById(id);
    }

    async delete(id) {
        await this.repository.update(id, {
            isDeleted: true,
            deletedAt: new Date(),
        });
    }
}
