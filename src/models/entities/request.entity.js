import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { EmployeeEntity } from './employee.entity.js';
import { LeaveTypeEntity } from './leave-type.entity.js';

@Entity('requests')
export class RequestEntity extends BaseEntity {
    @Column({ name: 'employee_id', type: 'int' })
    employeeId;

    @Column({ name: 'request_type', type: 'varchar' })
    requestType;

    @Column({ name: 'leave_type_id', nullable: true, type: 'int' })
    leaveTypeId;

    @Column({ name: 'request_content', type: 'text', nullable: true })
    requestContent;

    @Column({ name: 'start_date', type: 'date', nullable: true })
    startDate;

    @Column({ name: 'end_date', type: 'date', nullable: true })
    endDate;

    @Column({ name: 'request_status', default: 'PENDING', type: 'varchar' })
    requestStatus;

    @Column({ name: 'submitted_at', type: 'datetime', nullable: true })
    submittedAt;

    @Column({ name: 'approved_by', type: 'int', nullable: true })
    approvedBy;

    @Column({ name: 'approved_at', type: 'datetime', nullable: true })
    approvedAt;

    @Column({ name: 'rejected_by', type: 'int', nullable: true })
    rejectedBy;

    @Column({ name: 'rejected_at', type: 'datetime', nullable: true })
    rejectedAt;

    @Column({ name: 'rejection_reason', type: 'text', nullable: true })
    rejectionReason;

    @Column({ name: 'cancelled_at', type: 'datetime', nullable: true })
    cancelledAt;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'employee_id' })
    employee;

    @ManyToOne(() => LeaveTypeEntity)
    @JoinColumn({ name: 'leave_type_id' })
    leaveType;
}
