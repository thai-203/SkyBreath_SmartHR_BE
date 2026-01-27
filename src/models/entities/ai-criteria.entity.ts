import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('ai_criteria')
export class AICriteriaEntity extends BaseEntity {
    @Column({ name: 'criteria_name' })
    criteriaName: string;

    @Column({ type: 'decimal', precision: 5, scale: 2 })
    weight: number;

    @Column({ nullable: true })
    description: string;
}
