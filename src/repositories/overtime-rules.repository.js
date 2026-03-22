import { AppDataSource } from '../database/data-source.js';
import { OvertimeRuleEntity } from '../models/entities/overtime-rule.entity.js';
import { OvertimeRuleDepartmentEntity } from '../models/entities/overtime-rule-department.entity.js';

export class OvertimeRulesRepository {
    constructor() {
        this.repository = AppDataSource.getRepository(OvertimeRuleEntity);
        this.ruleDeptRepository = AppDataSource.getRepository(OvertimeRuleDepartmentEntity);
    }

    async findAll(options = {}) {
        const {
            skip = 0, take = 10,
            search, versionStatus, overtimeTypeId, departmentId,
            minMultiplier, maxMultiplier,
            minHoursPerDay, maxHoursPerDay,
            minHoursPerMonth, maxHoursPerMonth,
        } = options;

        const query = this.repository.createQueryBuilder('rule')
            .leftJoinAndSelect('rule.overtimeType', 'overtimeType')
            .where('rule.isDeleted = :isDeleted', { isDeleted: false });

        if (search) {
            query.andWhere('rule.name LIKE :search', { search: `%${search}%` });
        }
        if (versionStatus) {
            query.andWhere('rule.versionStatus = :versionStatus', { versionStatus });
        }
        if (overtimeTypeId) {
            query.andWhere('rule.overtimeTypeId = :overtimeTypeId', { overtimeTypeId });
        }
        if (departmentId) {
            query.innerJoin(
                'overtime_rule_departments', 'ord',
                'ord.overtime_rule_id = rule.id AND ord.is_deleted = false AND ord.department_id = :departmentId',
                { departmentId }
            );
        }
        if (minMultiplier !== undefined) query.andWhere('rule.salaryMultiplier >= :minMultiplier', { minMultiplier });
        if (maxMultiplier !== undefined) query.andWhere('rule.salaryMultiplier <= :maxMultiplier', { maxMultiplier });
        if (minHoursPerDay !== undefined) query.andWhere('rule.maxHoursPerDay >= :minHoursPerDay', { minHoursPerDay });
        if (maxHoursPerDay !== undefined) query.andWhere('rule.maxHoursPerDay <= :maxHoursPerDay', { maxHoursPerDay });
        if (minHoursPerMonth !== undefined) query.andWhere('rule.maxHoursPerMonth >= :minHoursPerMonth', { minHoursPerMonth });
        if (maxHoursPerMonth !== undefined) query.andWhere('rule.maxHoursPerMonth <= :maxHoursPerMonth', { maxHoursPerMonth });

        const [rules, total] = await query
            .orderBy('rule.createdAt', 'DESC')
            .skip(skip)
            .take(take)
            .getManyAndCount();

        for (const rule of rules) {
            const ruleDepts = await this.ruleDeptRepository.find({
                where: { overtimeRuleId: rule.id, isDeleted: false },
                relations: ['department'],
            });
            rule.departments = ruleDepts.map((rd) => rd.department).filter(Boolean);
        }

        return { items: rules, total };
    }

    async findById(id) {
        const rule = await this.repository.findOne({
            where: { id, isDeleted: false },
            relations: ['overtimeType'],
        });

        if (rule) {
            const ruleDepts = await this.ruleDeptRepository.find({
                where: { overtimeRuleId: rule.id, isDeleted: false },
                relations: ['department'],
            });
            rule.departments = ruleDepts.map((rd) => rd.department).filter(Boolean);
        }

        return rule;
    }

    /**
     * Tìm các policy cùng overtimeTypeId có overlap effective date
     */
    async findOverlapping(overtimeTypeId, effectiveFrom, effectiveTo, excludeId = null) {
        const query = this.repository.createQueryBuilder('rule')
            .where('rule.isDeleted = false')
            .andWhere('rule.overtimeTypeId = :overtimeTypeId', { overtimeTypeId })
            .andWhere('rule.versionStatus != :draft', { draft: 'DRAFT' });

        if (effectiveTo) {
            query.andWhere(
                '(rule.effectiveFrom <= :effectiveTo AND (rule.effectiveTo IS NULL OR rule.effectiveTo >= :effectiveFrom))',
                { effectiveFrom, effectiveTo }
            );
        } else {
            query.andWhere(
                '(rule.effectiveTo IS NULL OR rule.effectiveTo >= :effectiveFrom)',
                { effectiveFrom }
            );
        }

        if (excludeId) {
            query.andWhere('rule.id != :excludeId', { excludeId });
        }

        return query.getMany();
    }

    async hasLinkedRequests(id) {
        try {
            const result = await AppDataSource.query(
                `SELECT 1 FROM overtime_request_details WHERE policy_id = ? LIMIT 1`,
                [id]
            );
            return result.length > 0;
        } catch {
            return false;
        }
    }

    async create(data) {
        const { departmentIds, ...ruleData } = data;

        const rule = this.repository.create(ruleData);
        const savedRule = await this.repository.save(rule);

        if (departmentIds && departmentIds.length > 0) {
            const ruleDepts = departmentIds.map((deptId) =>
                this.ruleDeptRepository.create({
                    overtimeRuleId: savedRule.id,
                    departmentId: deptId,
                })
            );
            await this.ruleDeptRepository.save(ruleDepts);
        }

        return this.findById(savedRule.id);
    }

    async update(id, data) {
        const { departmentIds, ...ruleData } = data;

        if (Object.keys(ruleData).length > 0) {
            await this.repository.update(id, ruleData);
        }

        if (departmentIds) {
            await this.ruleDeptRepository.delete({ overtimeRuleId: id });
            if (departmentIds.length > 0) {
                const ruleDepts = departmentIds.map((deptId) =>
                    this.ruleDeptRepository.create({
                        overtimeRuleId: id,
                        departmentId: deptId,
                    })
                );
                await this.ruleDeptRepository.save(ruleDepts);
            }
        }

        return this.findById(id);
    }

    async activate(id, overtimeTypeId) {
        // EXPIRE các policy ACTIVE cùng type
        await this.repository
            .createQueryBuilder()
            .update(OvertimeRuleEntity)
            .set({ versionStatus: 'EXPIRED', status: 'INACTIVE' })
            .where('overtimeTypeId = :type AND versionStatus = :active AND id != :id AND isDeleted = false', {
                type: overtimeTypeId,
                active: 'ACTIVE',
                id,
            })
            .execute();

        // Activate policy mới
        await this.repository.update(id, {
            versionStatus: 'ACTIVE',
            status: 'ACTIVE',
        });

        return this.findById(id);
    }

    async delete(id) {
        await this.ruleDeptRepository.update(
            { overtimeRuleId: id },
            { isDeleted: true, deletedAt: new Date() }
        );
        await this.repository.update(id, {
            isDeleted: true,
            deletedAt: new Date(),
        });
    }
}
