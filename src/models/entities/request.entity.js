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

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'employee_id' })
    employee;

    @ManyToOne(() => LeaveTypeEntity)
    @JoinColumn({ name: 'leave_type_id' })
    leaveType;
}
