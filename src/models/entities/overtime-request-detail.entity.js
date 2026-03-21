import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { RequestEntity } from './request.entity.js';
import { OvertimeRuleEntity } from './overtime-rule.entity.js';

@Entity('overtime_request_details')
export class OvertimeRequestDetailEntity extends BaseEntity {
    @Column({ name: 'request_id', type: 'int' })
    requestId;

    @Column({ name: 'overtime_type_id', type: 'int', nullable: true })
    overtimeTypeId;

    @Column({ name: 'overtime_rule_id', type: 'int', nullable: true })
    overtimeRuleId;

    @Column({ name: 'work_date', type: 'date' })
    workDate;

    @Column({ name: 'start_time', type: 'time', nullable: true })
    startTime;

    @Column({ name: 'end_time', type: 'time', nullable: true })
    endTime;

    @Column({ name: 'total_hours', type: 'decimal', precision: 5, scale: 2 })
    totalHours;

    @Column({ name: 'rate_multiplier', type: 'decimal', precision: 5, scale: 2, nullable: true })
    rateMultiplier;

    @Column({ name: 'overtime_amount', type: 'decimal', precision: 15, scale: 2, nullable: true })
    overtimeAmount;

    @Column({ name: 'reason', type: 'text', nullable: true })
    reason;

    @Column({ name: 'payroll_id', type: 'int', nullable: true })
    payrollId;

    @ManyToOne(() => RequestEntity, { createForeignKeyConstraints: false })
    @JoinColumn({ name: 'request_id' })
    request;

    @ManyToOne(() => OvertimeRuleEntity, { createForeignKeyConstraints: false })
    @JoinColumn({ name: 'overtime_rule_id' })
    overtimeRule;
}
