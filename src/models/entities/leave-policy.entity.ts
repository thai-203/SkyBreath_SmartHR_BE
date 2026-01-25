import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { LeaveTypeEntity } from './leave-type.entity';

@Entity('leave_policies')
export class LeavePolicyEntity extends BaseEntity {
    @Column({ name: 'leave_type_id' })
    leaveTypeId: number;

    @Column({ name: 'policy_name' })
    policyName: string;

    @Column({ name: 'days_per_year' })
    daysPerYear: number;

    @ManyToOne(() => LeaveTypeEntity)
    @JoinColumn({ name: 'leave_type_id' })
    leaveType: LeaveTypeEntity;
}
