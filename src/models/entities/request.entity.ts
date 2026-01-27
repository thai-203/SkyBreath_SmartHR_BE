import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { EmployeeEntity } from './employee.entity';
import { LeaveTypeEntity } from './leave-type.entity';

@Entity('requests')
export class RequestEntity extends BaseEntity {
    @Column({ name: 'employee_id' })
    employeeId: number;

    @Column({ name: 'request_type' })
    requestType: string;

    @Column({ name: 'leave_type_id', nullable: true })
    leaveTypeId: number;

    @Column({ name: 'request_content', type: 'text', nullable: true })
    requestContent: string;

    @Column({ name: 'start_date', type: 'date', nullable: true })
    startDate: Date;

    @Column({ name: 'end_date', type: 'date', nullable: true })
    endDate: Date;

    @Column({ name: 'request_status', default: 'PENDING' })
    requestStatus: string;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'employee_id' })
    employee: EmployeeEntity;

    @ManyToOne(() => LeaveTypeEntity)
    @JoinColumn({ name: 'leave_type_id' })
    leaveType: LeaveTypeEntity;
}
