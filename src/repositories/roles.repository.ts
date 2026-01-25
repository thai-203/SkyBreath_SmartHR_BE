import { AppDataSource } from '../database/data-source';
import { RoleEntity } from '../models/entities/role.entity';

export class RolesRepository {
    private roleRepository = AppDataSource.getRepository(RoleEntity);

    async create(data: Partial<RoleEntity>): Promise<RoleEntity> {
        const role = this.roleRepository.create(data);
        return this.roleRepository.save(role);
    }

    async findAll(): Promise<RoleEntity[]> {
        return this.roleRepository.find({ where: { isDeleted: false } });
    }

    async findById(id: number): Promise<RoleEntity | null> {
        return this.roleRepository.findOne({ where: { id } });
    }

    async findByName(roleName: string): Promise<RoleEntity | null> {
        return this.roleRepository.findOne({ where: { roleName } });
    }

    async findByIds(ids: number[]): Promise<RoleEntity[]> {
        return this.roleRepository.findByIds(ids);
    }

    async update(id: number, data: Partial<RoleEntity>): Promise<RoleEntity> {
        await this.roleRepository.update(id, data);
        const updated = await this.findById(id);
        if (!updated) {
            throw new Error('Role not found');
        }
        return updated;
    }

    async delete(id: number): Promise<void> {
        await this.roleRepository.softDelete(id);
    }
}
