import { AppDataSource } from '../database/data-source.js';
import { RequestTypePolicyEntity } from '../models/entities/request-type-policy.entity.js';

export class RequestTypePoliciesRepository {
    constructor() {
        this.repository = AppDataSource.getRepository(RequestTypePolicyEntity);
    }

    async findByTypeId(typeId) {
        return await this.repository.findOne({
            where: { requestTypeId: typeId, isDeleted: false }
        });
    }

    async upsert(typeId, data) {
        let policy = await this.findByTypeId(typeId);
        if (policy) {
            await this.repository.update(policy.id, data);
        } else {
            policy = this.repository.create({ ...data, requestTypeId: typeId });
            await this.repository.save(policy);
        }
        return await this.findByTypeId(typeId);
    }

    async deleteByTypeId(typeId) {
        await this.repository.delete({ requestTypeId: typeId });
    }
}
