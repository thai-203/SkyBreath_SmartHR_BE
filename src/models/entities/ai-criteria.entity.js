import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';

@Entity('ai_criteria')
export class AICriteriaEntity extends BaseEntity {
    @Column({ name: 'criteria_name', type: 'varchar' })
    criteriaName;

    @Column({ type: 'decimal', precision: 5, scale: 2 })
    weight;

    @Column({ nullable: true, type: 'varchar' })
    description;
}
