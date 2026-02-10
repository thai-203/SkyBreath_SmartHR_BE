import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { DepartmentEntity } from './department.entity.js';
import { PositionEntity } from './position.entity.js';
import { EmployeeEntity } from './employee.entity.js';
import { OnboardingTaskEntity } from './onboarding-task.entity.js';

@Entity('onboarding_plans')
export class OnboardingPlanEntity extends BaseEntity {
    @Column({ name: 'plan_name', type: 'varchar' })
    planName;

    @Column({ type: 'text', nullable: true })
    description;

    @Column({ name: 'duration_days', type: 'int', default: 30 })
    durationDays;

    @Column({ name: 'department_id', nullable: true, type: 'int' })
    departmentId;

    @ManyToOne(() => DepartmentEntity)
    @JoinColumn({ name: 'department_id' })
    department;

    @ManyToOne(() => PositionEntity)
    @JoinColumn({ name: 'position_id' })
    position;

    @Column({ type: 'varchar', default: 'ACTIVE' })
    status;

    @Column({ name: 'created_by', nullable: true, type: 'int' })
    createdBy;

    @Column({ name: 'is_template', type: 'boolean', default: false })
    isTemplate;

    @OneToMany(() => OnboardingTaskEntity, (task) => task.plan, { cascade: true })
    tasks;
}
