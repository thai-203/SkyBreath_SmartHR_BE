import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { EmployeeEntity } from './employee.entity.js';

@Entity('contracts')
export class ContractEntity extends BaseEntity {
    @Column({ name: 'employee_id', type: 'int' })
    employeeId;

    @Column({ name: 'contract_number', type: 'varchar' })
    contractNumber;

    @Column({ name: 'contract_type', type: 'varchar', nullable: true })
    contractType;

    @Column({ name: 'start_date', type: 'date', nullable: true })
    startDate;

    @Column({ name: 'end_date', type: 'date', nullable: true })
    endDate;

    @Column({
        name: 'working_hours',
        type: 'decimal',
        precision: 5,
        scale: 2,
        nullable: true,
    })
    workingHours;

    @Column({ name: 'contract_status', type: 'varchar', nullable: true })
    contractStatus;

    @Column({ name: 'signed_date', type: 'date', nullable: true })
    signedDate;

    /* =======================
       TERMINATION INFORMATION
       ======================= */

    @Column({ name: 'termination_date', type: 'date', nullable: true })
    terminationDate;

    @Column({ name: 'termination_reason', type: 'varchar', nullable: true })
    terminationReason;

    @Column({
        name: 'termination_compensation',
        type: 'decimal',
        precision: 15,
        scale: 2,
        nullable: true,
        default: 0,
    })
    terminationCompensation;

    @Column({ name: 'termination_note', type: 'text', nullable: true })
    terminationNote;

    @Column({
        name: 'terminated_at',
        type: 'datetime',
        precision: 6,
        nullable: true,
    })
    terminatedAt;

    @Column({ name: 'terminated_by', type: 'int', nullable: true })
    terminatedBy;

    /* =======================
       RELATIONS
       ======================= */

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'employee_id' })
    employee;
}
