import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';

@Entity('overtime_rules')
export class OvertimeRuleEntity extends BaseEntity {
    @Column({ name: 'name', type: 'varchar' })
    name;

    @Column({ name: 'salary_multiplier', type: 'decimal', precision: 3, scale: 1 })
    salaryMultiplier;

    @Column({ name: 'max_hours_per_day', type: 'int' })
    maxHoursPerDay;

    @Column({ name: 'max_hours_per_month', type: 'int' })
    maxHoursPerMonth;

    @Column({ name: 'status', type: 'varchar', default: 'ACTIVE' })
    status;
}
