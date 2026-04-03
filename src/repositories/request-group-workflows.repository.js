import { AppDataSource } from '../database/data-source.js';
import { RequestGroupWorkflowEntity } from '../models/entities/request-group-workflow.entity.js';

export class RequestGroupWorkflowsRepository {
    constructor() {}

    get repository() {
        if (!this._repository) this._repository = AppDataSource.getRepository(RequestGroupWorkflowEntity);
        return this._repository;
    }

    async findByGroupId(groupId) {
        return await this.repository.find({
            where: { requestGroupId: groupId, isDeleted: false },
            order: { levelOrder: 'ASC' },
            relations: ['approverRole', 'approverUser']
        });
    }

    // Xoá tất cả workflow cũ của một group
    async deleteByGroupId(groupId) {
        // Thực hiện hard delete hoặc soft delete tuỳ logic, dùng soft delete cho an toàn
        await this.repository.delete({ requestGroupId: groupId });
    }

    async createMany(workflowsData) {
        const workflows = this.repository.create(workflowsData);
        return await this.repository.save(workflows);
    }
}
