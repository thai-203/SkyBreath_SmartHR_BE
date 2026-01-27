import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { EmployeeEntity } from './employee.entity';
import { LeaveTypeEntity } from './leave-type.entity';

@Entity('leave_balances')
export class LeaveBalanceEntity extends BaseEntity {
    @Column({ name: 'employee_id' })
    employeeId: number;

    @Column({ name: 'leave_type_id' })
    leaveTypeId: number;

    @Column()
    year: number;

    @Column({ name: 'used_days', type: 'decimal', precision: 5, scale: 2, default: 0 })
    usedDays: number;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'employee_id' })
    employee: EmployeeEntity;

    @ManyToOne(() => LeaveTypeEntity)
    @JoinColumn({ name: 'leave_type_id' })
    leaveType: LeaveTypeEntity;
}
