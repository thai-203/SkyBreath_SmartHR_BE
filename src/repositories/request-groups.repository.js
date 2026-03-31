import { AppDataSource } from '../database/data-source.js';
import { RequestGroupEntity } from '../models/entities/request-group.entity.js';

export class RequestGroupsRepository {
    constructor() {
        this.repository = AppDataSource.getRepository(RequestGroupEntity);
    }

    async findAll(options = {}) {
        const { skip = 0, take = 10, search, status } = options;

        const query = this.repository.createQueryBuilder('group')
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
            .take(take)
            .getManyAndCount();

        return { items: groups, total };
    }

    async findById(id) {
        return await this.repository.findOne({
            where: { id, isDeleted: false },
            relations: ['workflows', 'workflows.approverRole', 'requestTypes'],
        });
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
