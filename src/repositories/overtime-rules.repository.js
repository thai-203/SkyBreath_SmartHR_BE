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
     * Tìm các quy định (policy) bị trùng lặp về thời gian và phòng ban
     */
    async findOverlapping(overtimeTypeId, effectiveFrom, effectiveTo, departmentIds = null, excludeId = null) {
        // 1. Tạo query cơ bản: Tìm các quy định cùng loại (overtimeTypeId), đang hoạt động (ACTIVE) và chưa bị xóa
        const query = this.repository.createQueryBuilder('rule')
            .where('rule.isDeleted = false')
            .andWhere('rule.overtimeTypeId = :overtimeTypeId', { overtimeTypeId })
            .andWhere('rule.versionStatus = :active', { active: 'ACTIVE' });

        // 2. Kiểm tra trùng lặp về thời gian (Date Overlap logic)
        if (effectiveTo) {
            // Trường hợp quy định mới có ngày kết thúc
            query.andWhere(
                '(rule.effectiveFrom <= :effectiveTo AND (rule.effectiveTo IS NULL OR rule.effectiveTo >= :effectiveFrom))',
                { effectiveFrom, effectiveTo }
            );
        } else {
            // Trường hợp quy định mới áp dụng vô thời hạn (effectiveTo = null)
            query.andWhere(
                '(rule.effectiveTo IS NULL OR rule.effectiveTo >= :effectiveFrom)',
                { effectiveFrom }
            );
        }

        // 3. Nếu là đang cập nhật (update), ta phải loại trừ chính quy định đang sửa (excludeId) ra khỏi danh sách kiểm tra
        if (excludeId) {
            query.andWhere('rule.id != :excludeId', { excludeId });
        }

        // Lấy danh sách các quy định thỏa mãn điều kiện thời gian ở trên (ứng viên có thể gây trùng)
        const candidates = await query.getMany();

        const incomingDeptIds = Array.isArray(departmentIds) ? departmentIds : [];
        const incomingIsGlobal = incomingDeptIds.length === 0;

        const overlaps = [];

        // 4. Duyệt qua từng quy định ứng viên để kiểm tra trùng lặp về PHÒNG BAN
        for (const rule of candidates) {
            // Lấy danh sách phòng ban của quy định đang xét
            const ruleDepts = await this.ruleDeptRepository.find({
                where: { overtimeRuleId: rule.id, isDeleted: false },
                relations: ['department'],
            });

            const ruleDeptIds = ruleDepts.map(rd => rd.departmentId);
            const ruleIsGlobal = ruleDeptIds.length === 0; // Nếu không chọn phòng ban nào => Áp dụng cho "tất cả"

            // TH1: Quy định mới hoặc quy định cũ áp dụng cho "TẤT CẢ" phòng ban
            if (incomingIsGlobal || ruleIsGlobal) {
                rule.overlappingDepartments = ruleIsGlobal
                    ? ['tất cả phòng ban']
                    : ruleDepts.map(rd => rd.department?.departmentName).filter(Boolean);
                overlaps.push(rule);
                continue;
            }

            // TH2: Cả 2 đều áp dụng cho các phòng ban cụ thể => Kiểm tra xem có phòng ban nào chung không (intersection)
            const intersectingDepts = ruleDepts.filter(rd => incomingDeptIds.includes(rd.departmentId));
            if (intersectingDepts.length > 0) {
                // Lưu lại danh sách tên các phòng ban đang bị trùng để hiển thị lên thông báo lỗi cho người dùng
                rule.overlappingDepartments = intersectingDepts
                    .map(rd => rd.department?.departmentName)
                    .filter(Boolean);
                overlaps.push(rule);
            }
        }

        // Trả về danh sách các quy định thực sự bị trùng lặp (nếu rỗng nghĩa là an toàn)
        return overlaps;
    }

    async getUsageStatus(id) {
        try {
            const rule = await this.repository.findOne({ where: { id } });
            if (!rule || !rule.overtimeTypeId) {
                return { hasRequests: false, hasPayroll: false };
            }

            // Lọc bỏ các đơn Nháp (DRAFT), Bị từ chối (REJECTED), Đã hủy (CANCELLED/REVOKED)
            // Chỉ xem xét các đơn đã gửi duyệt (PENDING) hoặc đã duyệt (APPROVED)
            let queryStr = `SELECT id, status FROM requests WHERE overtime_type_id = ? AND is_deleted = false AND status IN ('PENDING', 'APPROVED')`;
            const params = [rule.overtimeTypeId];

            if (rule.effectiveFrom) {
                queryStr += ` AND start_date >= ?`;
                params.push(rule.effectiveFrom);
            }
            if (rule.effectiveTo) {
                queryStr += ` AND start_date <= ?`;
                params.push(rule.effectiveTo);
            }

            const requests = await AppDataSource.query(queryStr, params);

            if (requests.length === 0) {
                return { hasRequests: false, hasPayroll: false };
            }

            // hasRequests = true nếu có đơn PENDING hoặc APPROVED
            // hasPayroll: kiểm tra bảng payrolls xem đã có bảng lương APPROVED/LOCKED
            // trong khoảng thời gian hiệu lực của rule này chưa
            let hasPayroll = false;
            try {
                let payrollQuery = `SELECT id FROM payrolls WHERE is_deleted = false AND payroll_status IN ('APPROVED', 'LOCKED')`;
                const payrollParams = [];

                if (rule.effectiveFrom) {
                    // effectiveFrom dạng 'YYYY-MM-DD' → lấy năm/tháng
                    const fromDate = new Date(rule.effectiveFrom);
                    const fromYM = fromDate.getFullYear() * 100 + (fromDate.getMonth() + 1); // VD: 202601
                    payrollQuery += ` AND (payroll_year * 100 + payroll_month) >= ?`;
                    payrollParams.push(fromYM);
                }
                if (rule.effectiveTo) {
                    const toDate = new Date(rule.effectiveTo);
                    const toYM = toDate.getFullYear() * 100 + (toDate.getMonth() + 1);
                    payrollQuery += ` AND (payroll_year * 100 + payroll_month) <= ?`;
                    payrollParams.push(toYM);
                }

                payrollQuery += ` LIMIT 1`;
                const payrollRows = await AppDataSource.query(payrollQuery, payrollParams);
                hasPayroll = payrollRows.length > 0;
            } catch (payrollErr) {
                console.warn('[getUsageStatus] Không thể kiểm tra payrolls:', payrollErr.message);
                hasPayroll = false;
            }

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

            const newRuleDepts = await queryRunner.manager.find(OvertimeRuleDepartmentEntity, {
                where: { overtimeRuleId: newRule.id, isDeleted: false },
            });
            const newRuleDeptIds = newRuleDepts.map(rd => rd.departmentId);
            const newRuleIsGlobal = newRuleDeptIds.length === 0;

            const filteredActiveRules = [];
            for (const r of activeRules) {
                const rDepts = await queryRunner.manager.find(OvertimeRuleDepartmentEntity, {
                    where: { overtimeRuleId: r.id, isDeleted: false },
                });
                const rDeptIds = rDepts.map(rd => rd.departmentId);
                const rIsGlobal = rDeptIds.length === 0;

                if (newRuleIsGlobal || rIsGlobal) {
                    filteredActiveRules.push(r);
                    continue;
                }

                const intersects = newRuleDeptIds.some(id => rDeptIds.includes(id));
                if (intersects) {
                    filteredActiveRules.push(r);
                }
            }

            const parseDateString = (dateInput) => {
                if (!dateInput) return new Date(0);
                if (dateInput instanceof Date) return dateInput;
                return new Date(dateInput);
            };

            const newEffectiveFromDate = newRule.effectiveFrom ? parseDateString(newRule.effectiveFrom) : null;

            if (filteredActiveRules.length > 0) {
                if (filteredActiveRules.length > 1) {
                    throw new ConflictException('Quy định này đang trùng thời gian với nhiều quy định ACTIVE khác!');
                }

                const oldRule = filteredActiveRules[0];
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
