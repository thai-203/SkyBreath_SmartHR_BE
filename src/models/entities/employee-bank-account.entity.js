import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { EmployeeEntity } from './employee.entity.js';

@Entity('employee_bank_accounts')
export class EmployeeBankAccountEntity extends BaseEntity {
    @Column({ name: 'employee_id', type: 'int' })
    employeeId;

    @Column({ name: 'account_number', type: 'varchar' })
    accountNumber;

    @Column({ name: 'account_holder_name', type: 'varchar' })
    accountHolderName;

    @Column({ name: 'bank_name', type: 'varchar' })
    bankName;

    @Column({ name: 'bank_branch', nullable: true, type: 'varchar' })
    bankBranch;

    @Column({ nullable: true, type: 'varchar' })
    status;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'employee_id' })
    employee;
}
