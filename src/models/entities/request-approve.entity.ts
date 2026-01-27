import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { RequestEntity } from './request.entity';
import { EmployeeEntity } from './employee.entity';

@Entity('request_approves')
export class RequestApproveEntity extends BaseEntity {
    @Column({ name: 'request_id' })
    requestId: number;

    @Column({ name: 'approver_employee_id' })
    approverEmployeeId: number;

    @Column({ name: 'approval_level', default: 1 })
    approvalLevel: number;

    @Column({ name: 'approval_status', default: 'PENDING' })
    approvalStatus: string;

    @Column({ type: 'text', nullable: true })
    comment: string;

    @ManyToOne(() => RequestEntity)
    @JoinColumn({ name: 'request_id' })
    request: RequestEntity;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'approver_employee_id' })
    approver: EmployeeEntity;
}
