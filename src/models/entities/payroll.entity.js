import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { EmployeeEntity } from './employee.entity.js';

// payrollStatus: DRAFT | PENDING_APPROVAL | APPROVED | LOCKED

@Entity('payrolls')
export class PayrollEntity extends BaseEntity {
    @Column({ name: 'payroll_month', type: 'int' })
    payrollMonth;

    @Column({ name: 'payroll_year', type: 'int' })
    payrollYear;

    @Column({ name: 'payroll_status', nullable: true, type: 'varchar', default: 'DRAFT' })
    payrollStatus;

    @Column({ name: 'unit_name', nullable: true, type: 'varchar' })
    unitName;

    @Column({ name: 'contact_name', nullable: true, type: 'varchar' })
    contactName;

    @Column({ name: 'contact_phone', nullable: true, type: 'varchar' })
    contactPhone;

    @Column({ name: 'contact_email', nullable: true, type: 'varchar' })
    contactEmail;

    @Column({ name: 'payment_date', nullable: true, type: 'datetime' })
    paymentDate;

    @Column({ name: 'submitted_by', nullable: true, type: 'int' })
    submittedBy;

    @Column({ name: 'approved_by', nullable: true, type: 'int' })
    approvedBy;

    @Column({ name: 'approved_at', nullable: true, type: 'datetime' })
    approvedAt;

    @Column({ name: 'rejected_reason', nullable: true, type: 'text' })
    rejectedReason;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'submitted_by' })
    submitter;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'approved_by' })
    approver;
}
