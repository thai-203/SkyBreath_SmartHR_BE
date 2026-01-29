import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { EmployeeEntity } from './employee.entity.js';
import { LeaveTypeEntity } from './leave-type.entity.js';

@Entity('leave_balances')
export class LeaveBalanceEntity extends BaseEntity {
    @Column({ name: 'employee_id', type: 'int' })
    employeeId;

    @Column({ name: 'leave_type_id', type: 'int' })
    leaveTypeId;

    @Column({ type: 'int' })
    year;

    @Column({ name: 'used_days', type: 'decimal', precision: 5, scale: 2, default: 0 })
    usedDays;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'employee_id' })
    employee;

    @ManyToOne(() => LeaveTypeEntity)
    @JoinColumn({ name: 'leave_type_id' })
    leaveType;
}
