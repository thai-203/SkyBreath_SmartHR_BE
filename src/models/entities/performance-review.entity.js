import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { EmployeeEntity } from './employee.entity.js';

export const REVIEW_STATUS = {
    DRAFT: 'DRAFT',
    SUBMITTED: 'SUBMITTED',
};

@Entity('performance_reviews')
export class PerformanceReviewEntity extends BaseEntity {
    @Column({ name: 'employee_id', type: 'int' })
    employeeId;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'employee_id' })
    employee;

    @Column({ name: 'manager_id', type: 'int' })
    managerId;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'manager_id' })
    manager;

    @Column({ name: 'review_month', type: 'tinyint' })
    reviewMonth;

    @Column({ name: 'review_year', type: 'int' })
    reviewYear;

    @Column({
        name: 'score_compliance',
        type: 'decimal',
        precision: 5,
        scale: 2,
        default: 0.00,
    })
    scoreCompliance;

    @Column({
        name: 'score_attitude',
        type: 'decimal',
        precision: 5,
        scale: 2,
        default: 0.00,
    })
    scoreAttitude;

    @Column({
        name: 'score_learning',
        type: 'decimal',
        precision: 5,
        scale: 2,
        default: 0.00,
    })
    scoreLearning;

    @Column({
        name: 'score_teamwork',
        type: 'decimal',
        precision: 5,
        scale: 2,
        default: 0.00,
    })
    scoreTeamwork;

    @Column({
        name: 'score_skills',
        type: 'decimal',
        precision: 5,
        scale: 2,
        default: 0.00,
    })
    scoreSkills;

    @Column({
        name: 'score_result',
        type: 'decimal',
        precision: 5,
        scale: 2,
        default: 0.00,
    })
    scoreResult;

    @Column({
        name: 'total_score',
        type: 'decimal',
        precision: 5,
        scale: 2,
        default: 0.00,
    })
    totalScore;

    @Column({ name: 'manager_comment', type: 'text', nullable: true })
    managerComment;

    @Column({ type: 'varchar', length: 50, default: REVIEW_STATUS.SUBMITTED })
    status;
}
