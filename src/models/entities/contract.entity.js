import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { EmployeeEntity } from './employee.entity.js';

@Entity('contracts')
export class ContractEntity extends BaseEntity {
    @Column({ name: 'employee_id', type: 'int' })
    employeeId;

    @Column({ name: 'contract_number', type: 'varchar' })
    contractNumber;

    @Column({ name: 'contract_type', nullable: true, type: 'varchar' })
    contractType;

    @Column({ name: 'start_date', type: 'date', nullable: true })
    startDate;

    @Column({ name: 'end_date', type: 'date', nullable: true })
    endDate;

    @Column({ name: 'working_hours', nullable: true, type: 'decimal', precision: 5, scale: 2 })
    workingHours;

    @Column({ name: 'contract_status', nullable: true, type: 'varchar' })
    contractStatus;

    @Column({ name: 'signed_date', type: 'date', nullable: true })
    signedDate;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'employee_id' })
    employee;
}
