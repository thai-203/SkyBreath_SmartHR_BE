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
            skip = 0, take = 5,
            search, status, departmentId,
            minMultiplier, maxMultiplier,
            minHoursPerDay, maxHoursPerDay,
            minHoursPerMonth, maxHoursPerMonth,
        } = options;

        const query = this.repository.createQueryBuilder('rule')
            .where('rule.isDeleted = :isDeleted', { isDeleted: false });

        // Search by name
        if (search) {
            query.andWhere('rule.name LIKE :search', { search: `%${search}%` });
        }

        // Filter by status
        if (status) {
            query.andWhere('rule.status = :status', { status });
        }

        // Filter by department (JOIN qua bảng trung gian)
        if (departmentId) {
            query.innerJoin(
                'overtime_rule_departments', 'ord',
                'ord.overtime_rule_id = rule.id AND ord.is_deleted = false AND ord.department_id = :departmentId',
                { departmentId }
            );
        }

        // Filter by salary multiplier range
        if (minMultiplier !== undefined) {
            query.andWhere('rule.salaryMultiplier >= :minMultiplier', { minMultiplier });
        }
        if (maxMultiplier !== undefined) {
            query.andWhere('rule.salaryMultiplier <= :maxMultiplier', { maxMultiplier });
        }

        // Filter by max hours per day range
        if (minHoursPerDay !== undefined) {
            query.andWhere('rule.maxHoursPerDay >= :minHoursPerDay', { minHoursPerDay });
        }
        if (maxHoursPerDay !== undefined) {
            query.andWhere('rule.maxHoursPerDay <= :maxHoursPerDay', { maxHoursPerDay });
        }

        // Filter by max hours per month range
        if (minHoursPerMonth !== undefined) {
            query.andWhere('rule.maxHoursPerMonth >= :minHoursPerMonth', { minHoursPerMonth });
        }
        if (maxHoursPerMonth !== undefined) {
            query.andWhere('rule.maxHoursPerMonth <= :maxHoursPerMonth', { maxHoursPerMonth });
        }

        const [rules, total] = await query
            .orderBy('rule.createdAt', 'DESC')
            .skip(skip)
            .take(take)
            .getManyAndCount();

        // Lấy danh sách departments cho mỗi rule
        for (const rule of rules) {
            const ruleDepts = await this.ruleDeptRepository.find({
                where: { overtimeRuleId: rule.id, isDeleted: false },
                relations: ['department'],
            });
            rule.departments = ruleDepts.map((rd) => rd.department);
        }

        return { items: rules, total };
    }

    async findById(id) {
        const rule = await this.repository.findOne({
            where: { id, isDeleted: false },
        });

        if (rule) {
            const ruleDepts = await this.ruleDeptRepository.find({
                where: { overtimeRuleId: rule.id, isDeleted: false },
                relations: ['department'],
            });
            rule.departments = ruleDepts.map((rd) => rd.department);
        }

        return rule;
    }

    async create(data) {
        const { departmentIds, ...ruleData } = data;

        // Tạo overtime rule
        const rule = this.repository.create(ruleData);
        const savedRule = await this.repository.save(rule);

        // Tạo quan hệ với departments
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

        // Cập nhật thông tin rule
        if (Object.keys(ruleData).length > 0) {
            await this.repository.update(id, ruleData);
        }

        // Cập nhật danh sách departments nếu có
        if (departmentIds) {
            // Xóa quan hệ cũ
            await this.ruleDeptRepository.delete({ overtimeRuleId: id });

            // Tạo quan hệ mới
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

    async delete(id) {
        // Xóa mềm các quan hệ departments
        await this.ruleDeptRepository.update(
            { overtimeRuleId: id },
            { isDeleted: true, deletedAt: new Date() }
        );

        // Xóa mềm rule
        await this.repository.update(id, {
            isDeleted: true,
            deletedAt: new Date(),
        });
    }
}
