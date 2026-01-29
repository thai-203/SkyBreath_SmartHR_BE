import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { RequestEntity } from './request.entity.js';
import { EmployeeEntity } from './employee.entity.js';

@Entity('request_approves')
export class RequestApproveEntity extends BaseEntity {
    @Column({ name: 'request_id', type: 'int' })
    requestId;

    @Column({ name: 'approver_employee_id', type: 'int' })
    approverEmployeeId;

    @Column({ name: 'approval_level', default: 1, type: 'int' })
    approvalLevel;

    @Column({ name: 'approval_status', default: 'PENDING', type: 'varchar' })
    approvalStatus;

    @Column({ type: 'text', nullable: true })
    comment;

    @ManyToOne(() => RequestEntity)
    @JoinColumn({ name: 'request_id' })
    request;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'approver_employee_id' })
    approver;
}
