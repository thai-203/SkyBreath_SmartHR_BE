import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleEntity } from '../entities';

@Injectable()
export class RolesRepository {
    constructor(
        @InjectRepository(RoleEntity)
        private readonly roleRepository: Repository<RoleEntity>,
    ) { }

    async create(data: Partial<RoleEntity>): Promise<RoleEntity> {
        const role = this.roleRepository.create(data);
        return this.roleRepository.save(role);
    }

    async findAll(): Promise<RoleEntity[]> {
        return this.roleRepository.find({ where: { isActive: true } });
    }

    async findById(id: string): Promise<RoleEntity | null> {
        return this.roleRepository.findOne({ where: { id } });
    }

    async findByName(name: string): Promise<RoleEntity | null> {
        return this.roleRepository.findOne({ where: { name } });
    }

    async findByIds(ids: string[]): Promise<RoleEntity[]> {
        return this.roleRepository.findByIds(ids);
    }

    async update(id: string, data: Partial<RoleEntity>): Promise<RoleEntity> {
        await this.roleRepository.update(id, data);
        const updated = await this.findById(id);
        if (!updated) {
            throw new Error('Role not found');
        }
        return updated;
    }

    async delete(id: string): Promise<void> {
        await this.roleRepository.softDelete(id);
    }
}
