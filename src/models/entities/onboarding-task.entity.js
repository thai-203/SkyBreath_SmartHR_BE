import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { OnboardingPlanEntity } from './onboarding-plan.entity.js';
import { DepartmentEntity } from './department.entity.js';

@Entity('onboarding_tasks')
export class OnboardingTaskEntity extends BaseEntity {
    @Column({ name: 'plan_id', type: 'int' })
    planId;

    @ManyToOne(() => OnboardingPlanEntity, (plan) => plan.tasks)
    @JoinColumn({ name: 'plan_id' })
    plan;

    @Column({ name: 'task_title', type: 'varchar' })
    taskTitle;

    @Column({ type: 'text', nullable: true })
    description;

    @Column({ name: 'task_order', type: 'int' })
    taskOrder; 

    @Column({name: 'responsible_department_id', type: 'int', nullable: true})
    responsibleDepartmentId;

    @ManyToOne(() => DepartmentEntity, { nullable: true })
    @JoinColumn({ name: 'responsible_department_id' })
    responsibleDepartment;

    @Column({ name: 'is_mandatory', type: 'boolean', default: false })
    isMandatory;

    @Column({ name: 'estimated_days', type: 'int', nullable: true })
    estimatedDays;

    @Column({ type: 'varchar', default: 'NOT_STARTED' })
    status;

    @Column({ type: 'varchar', nullable: true })
    category;
}
