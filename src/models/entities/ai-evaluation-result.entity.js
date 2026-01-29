import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { EmployeeEntity } from './employee.entity.js';
import { AICriteriaEntity } from './ai-criteria.entity.js';

@Entity('ai_evaluation_results')
export class AIEvaluationResultEntity extends BaseEntity {
    @Column({ name: 'employee_id', type: 'int' })
    employeeId;

    @Column({ name: 'criteria_id', type: 'int' })
    criteriaId;

    @Column({ type: 'decimal', precision: 5, scale: 2 })
    score;

    @Column({ nullable: true, type: 'text' })
    feedback;

    @Column({ name: 'evaluated_at', type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    evaluatedAt;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'employee_id' })
    employee;

    @ManyToOne(() => AICriteriaEntity)
    @JoinColumn({ name: 'criteria_id' })
    criteria;
}
