import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { EmployeeEntity } from './employee.entity';

@Entity('employee_bank_accounts')
export class EmployeeBankAccountEntity extends BaseEntity {
    @Column({ name: 'employee_id' })
    employeeId: number;

    @Column({ name: 'account_number' })
    accountNumber: string;

    @Column({ name: 'account_holder_name' })
    accountHolderName: string;

    @Column({ name: 'bank_name' })
    bankName: string;

    @Column({ name: 'bank_branch', nullable: true })
    bankBranch: string;

    @Column({ nullable: true })
    status: string;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'employee_id' })
    employee: EmployeeEntity;
}
