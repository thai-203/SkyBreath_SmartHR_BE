import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { EmployeeEntity } from './employee.entity.js';
import { OnboardingPlanEntity } from './onboarding-plan.entity.js';
import { TaskAssignmentEntity } from './task-assignment.entity.js';

@Entity('onboarding_progress')
export class OnboardingProgressEntity extends BaseEntity {
    @Column({ name: 'employee_id', type: 'int' })
    employeeId;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'employee_id' })
    employee;

    @Column({ name: 'plan_id', type: 'int' })
    planId;

    @ManyToOne(() => OnboardingPlanEntity)
    @JoinColumn({ name: 'plan_id' })
    plan;

    @Column({ name: 'overall_status', type: 'varchar', default: 'IN_PROGRESS' })
    overallStatus;

    @Column({ name: 'start_date', type: 'date' })
    startDate;

    @Column({ name: 'expected_end_date', type: 'date', nullable: true })
    expectedEndDate;

    @Column({ name: 'actual_end_date', type: 'date', nullable: true })
    actualEndDate;

    @Column({ name: 'progress_percentage', type: 'decimal', precision: 5, scale: 2, default: 0 })
    progressPercentage;

    @Column({ name: 'completed_tasks_count', type: 'int', default: 0 })
    completedTasksCount;

    @Column({ name: 'total_tasks_count', type: 'int', default: 0 })
    totalTasksCount;

    @Column({ name: 'assigned_mentor_id', nullable: true, type: 'int' })
    assignedMentorId;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'assigned_mentor_id' })
    assignedMentor;

    @OneToMany(() => TaskAssignmentEntity, (assignment) => assignment.progress, { cascade: true })
    taskAssignments;
}
