import { Entity, Column, OneToOne, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { RequestEntity } from './request.entity.js';
import { OvertimeTypeEntity } from './overtime-type.entity.js';
import { OvertimeRuleEntity } from './overtime-rule.entity.js';
import { PayrollEntity } from './payroll.entity.js';

@Entity('overtime_request_details')
export class OvertimeRequestDetailEntity extends BaseEntity {
    @Column({ name: 'request_id', type: 'int', unique: true })
    requestId;

    @OneToOne(() => RequestEntity)
    @JoinColumn({ name: 'request_id' })
    request;

    @Column({ name: 'overtime_type_id', type: 'int' })
    overtimeTypeId;

    @ManyToOne(() => OvertimeTypeEntity)
    @JoinColumn({ name: 'overtime_type_id' })
    overtimeType;

    @Column({ name: 'overtime_rule_id', type: 'int' })
    overtimeRuleId;

    @ManyToOne(() => OvertimeRuleEntity)
    @JoinColumn({ name: 'overtime_rule_id' })
    overtimeRule;

    @Column({ name: 'work_date', type: 'date' })
    workDate;

    @Column({ name: 'start_time', type: 'time' })
    startTime;

    @Column({ name: 'end_time', type: 'time' })
    endTime;

    @Column({ name: 'total_hours', type: 'decimal', precision: 5, scale: 2 })
    totalHours;

    @Column({ name: 'rate_multiplier', type: 'decimal', precision: 5, scale: 2 })
    rateMultiplier;

    @Column({ name: 'overtime_amount', type: 'decimal', precision: 15, scale: 2, nullable: true })
    overtimeAmount;

    @Column({ name: 'reason', type: 'text', nullable: true })
    reason;

    @Column({ name: 'payroll_id', type: 'int', nullable: true })
    payrollId;

    @ManyToOne(() => PayrollEntity)
    @JoinColumn({ name: 'payroll_id' })
    payroll;
}
