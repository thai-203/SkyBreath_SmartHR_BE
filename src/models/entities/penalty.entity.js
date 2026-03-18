import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';

@Entity('penalties')
export class PenaltyEntity extends BaseEntity {
    @Column({ name: 'name', type: 'varchar' })
    name;

    @Column({ name: 'penalty_type', type: 'varchar' })
    penaltyType;

    @Column({ name: 'severity_level', type: 'varchar' })
    severityLevel;

    @Column({ name: 'deduction_amount', type: 'decimal', precision: 15, scale: 2, nullable: true })
    deductionAmount;

    @Column({ name: 'deduction_percentage', type: 'decimal', precision: 5, scale: 2, nullable: true })
    deductionPercentage;

    @Column({ name: 'description', type: 'text', nullable: true })
    description;

    @Column({ name: 'status', type: 'varchar', default: 'ACTIVE' })
    status;
}
