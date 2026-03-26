import { AppDataSource } from '../database/data-source.js';
import { OvertimeRuleEntity } from '../models/entities/overtime-rule.entity.js';
import { OvertimeRuleDepartmentEntity } from '../models/entities/overtime-rule-department.entity.js';
import { ConflictException } from '../common/exceptions/index.js';

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

            const usage = await this.getUsageStatus(rule.id);
            rule.hasRequests = usage.hasRequests;
            rule.hasPayroll = usage.hasPayroll;
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

            const usage = await this.getUsageStatus(rule.id);
            rule.hasRequests = usage.hasRequests;
            rule.hasPayroll = usage.hasPayroll;
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
            .andWhere('rule.versionStatus = :active', { active: 'ACTIVE' });

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

    async getUsageStatus(id) {
        try {
            const requests = await AppDataSource.query(
                `SELECT payroll_id FROM overtime_request_details WHERE overtime_rule_id = ?`,
                [id]
            );

            if (requests.length === 0) {
                return { hasRequests: false, hasPayroll: false };
            }

            const hasPayroll = requests.some(row => row.payroll_id !== null);
            return { hasRequests: true, hasPayroll };
        } catch (err) {
            console.error("Error checking usage status:", err);
            return { hasRequests: false, hasPayroll: false };
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

    async activateWithAutoVersioning(newRule) {
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const activeRulesQuery = queryRunner.manager
                .createQueryBuilder(OvertimeRuleEntity, 'rule')
                .where('rule.isDeleted = false')
                .andWhere('rule.overtimeTypeId = :overtimeTypeId', { overtimeTypeId: newRule.overtimeTypeId })
                .andWhere('rule.versionStatus = :active', { active: 'ACTIVE' })
                .andWhere('rule.id != :newRuleId', { newRuleId: newRule.id });

            if (newRule.effectiveFrom) {
                // Handle date conversion if needed
                const effectiveFromStr = newRule.effectiveFrom instanceof Date ?
                    newRule.effectiveFrom.toISOString().split('T')[0] : newRule.effectiveFrom;

                activeRulesQuery.andWhere(
                    '(rule.effectiveTo IS NULL OR rule.effectiveTo >= :effectiveFrom)',
                    { effectiveFrom: effectiveFromStr }
                );
            }

            if (newRule.effectiveTo) {
                const effectiveToStr = newRule.effectiveTo instanceof Date ?
                    newRule.effectiveTo.toISOString().split('T')[0] : newRule.effectiveTo;

                activeRulesQuery.andWhere(
                    '(rule.effectiveFrom <= :effectiveTo)',
                    { effectiveTo: effectiveToStr }
                );
            }

            const activeRules = await activeRulesQuery.getMany();

            const parseDateString = (dateInput) => {
                if (!dateInput) return new Date(0);
                if (dateInput instanceof Date) return dateInput;
                return new Date(dateInput);
            };

            const newEffectiveFromDate = newRule.effectiveFrom ? parseDateString(newRule.effectiveFrom) : null;

            if (activeRules.length > 0) {
                if (activeRules.length > 1) {
                    throw new ConflictException('Quy định này đang trùng thời gian với nhiều quy định ACTIVE khác!');
                }

                const oldRule = activeRules[0];
                const oldEffectiveFromDate = oldRule.effectiveFrom ? parseDateString(oldRule.effectiveFrom) : new Date(0);

                if (oldRule.effectiveTo === null && newEffectiveFromDate && oldEffectiveFromDate < newEffectiveFromDate) {
                    const prevDay = new Date(newEffectiveFromDate);
                    prevDay.setDate(prevDay.getDate() - 1);
                    const year = prevDay.getFullYear();
                    const month = String(prevDay.getMonth() + 1).padStart(2, '0');
                    const day = String(prevDay.getDate()).padStart(2, '0');
                    const prevDayString = `${year}-${month}-${day}`;

                    await queryRunner.manager.update(OvertimeRuleEntity, oldRule.id, {
                        effectiveTo: prevDayString
                    });
                } else {
                    const rulePeriod = `Từ ${oldRule.effectiveFrom}${oldRule.effectiveTo ? ' đến ' + oldRule.effectiveTo : ' - Vô thời hạn'}`;
                    throw new ConflictException(
                        `Khoảng thời gian hiệu lực bị trùng với quy định "${oldRule.name}" (${rulePeriod}). Vui lòng kiểm tra lại ngày áp dụng.`
                    );
                }
            }

            // Kích hoạt policy mới
            await queryRunner.manager.update(OvertimeRuleEntity, newRule.id, {
                versionStatus: 'ACTIVE',
                status: 'ACTIVE'
            });

            await queryRunner.commitTransaction();
            return this.findById(newRule.id);
        } catch (err) {
            await queryRunner.rollbackTransaction();
            throw err;
        } finally {
            await queryRunner.release();
        }
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
