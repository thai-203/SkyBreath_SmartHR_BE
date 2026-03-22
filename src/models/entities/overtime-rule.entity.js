import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { OvertimeTypeEntity } from './overtime-type.entity.js';

@Entity('overtime_rules')
export class OvertimeRuleEntity extends BaseEntity {
    @Column({ name: 'name', type: 'varchar', length: 200 })
    name;

    // FK → overtime_types
    @Column({ name: 'overtime_type_id', type: 'int', nullable: true })
    overtimeTypeId;

    @ManyToOne(() => OvertimeTypeEntity)
    @JoinColumn({ name: 'overtime_type_id' })
    overtimeType;

    @Column({ name: 'salary_multiplier', type: 'decimal', precision: 5, scale: 2 })
    salaryMultiplier;

    @Column({ name: 'max_hours_per_day', type: 'int' })
    maxHoursPerDay;

    @Column({ name: 'max_hours_per_month', type: 'int' })
    maxHoursPerMonth;

    @Column({ name: 'effective_from', type: 'date', nullable: true })
    effectiveFrom;

    @Column({ name: 'effective_to', type: 'date', nullable: true })
    effectiveTo;

    @Column({ name: 'note', type: 'varchar', length: 500, nullable: true })
    note;

    @Column({
        name: 'version_status',
        type: 'enum',
        enum: ['DRAFT', 'ACTIVE', 'EXPIRED'],
        default: 'DRAFT',
    })
    versionStatus;

    // Backward compat
    @Column({ name: 'status', type: 'varchar', length: 20, default: 'ACTIVE' })
    status;
}
