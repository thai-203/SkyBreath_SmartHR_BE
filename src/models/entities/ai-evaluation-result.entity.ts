import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { EmployeeEntity } from './employee.entity';
import { AICriteriaEntity } from './ai-criteria.entity';

@Entity('ai_evaluation_results')
export class AIEvaluationResultEntity extends BaseEntity {
    @Column({ name: 'employee_id' })
    employeeId: number;

    @Column({ name: 'criteria_id' })
    criteriaId: number;

    @Column({ type: 'decimal', precision: 5, scale: 2 })
    score: number;

    @Column({ nullable: true })
    feedback: string;

    @Column({ name: 'evaluated_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    evaluatedAt: Date;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'employee_id' })
    employee: EmployeeEntity;

    @ManyToOne(() => AICriteriaEntity)
    @JoinColumn({ name: 'criteria_id' })
    criteria: AICriteriaEntity;
}
