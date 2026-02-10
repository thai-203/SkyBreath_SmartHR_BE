import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { OnboardingProgressEntity } from './onboarding-progress.entity.js';
import { OnboardingTaskEntity } from './onboarding-task.entity.js';
import { EmployeeEntity } from './employee.entity.js';
import { UserEntity } from './user.entity.js';

@Entity('task_assignments')
export class TaskAssignmentEntity extends BaseEntity {
    @Column({ name: 'progress_id', type: 'int' })
    progressId;

    @ManyToOne(() => OnboardingProgressEntity, (progress) => progress.taskAssignments)
    @JoinColumn({ name: 'progress_id' })
    progress;

    @Column({ name: 'task_id', type: 'int' })
    taskId;

    @ManyToOne(() => OnboardingTaskEntity)
    @JoinColumn({ name: 'task_id' })
    task;

    @Column({ name: 'assigned_to_employee_id', nullable: true, type: 'int' })
    assignedToEmployeeId;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'assigned_to_employee_id' })
    assignedToEmployee;

    @Column({ name: 'assigned_by_user_id', type: 'int' })
    assignedByUserId;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'assigned_by_user_id' })
    assignedByUser;

    @Column({ type: 'varchar', default: 'PENDING' })
    status;

    @Column({ name: 'assigned_date', type: 'datetime' })
    assignedDate;

    @Column({ name: 'due_date', type: 'date', nullable: true })
    dueDate;

    @Column({ name: 'completion_date', type: 'datetime', nullable: true })
    completionDate;

    @Column({ type: 'text', nullable: true })
    notes;

    @Column({ name: 'priority', type: 'varchar', default: 'NORMAL' })
    priority;
}
