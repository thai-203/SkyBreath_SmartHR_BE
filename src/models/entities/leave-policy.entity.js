import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { LeaveTypeEntity } from './leave-type.entity.js';

@Entity('leave_policies')
export class LeavePolicyEntity extends BaseEntity {
    @Column({ name: 'leave_type_id', type: 'int' })
    leaveTypeId;

    @Column({ name: 'policy_name', type: 'varchar' })
    policyName;

    @Column({ name: 'days_per_year', type: 'int' })
    daysPerYear;

    @ManyToOne(() => LeaveTypeEntity)
    @JoinColumn({ name: 'leave_type_id' })
    leaveType;
}
