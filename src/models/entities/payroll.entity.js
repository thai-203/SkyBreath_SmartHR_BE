import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';

@Entity('payrolls')
export class PayrollEntity extends BaseEntity {
    @Column({ name: 'payroll_month', type: 'int' })
    payrollMonth;

    @Column({ name: 'payroll_year', type: 'int' })
    payrollYear;

    @Column({ name: 'payroll_status', nullable: true, type: 'varchar' })
    payrollStatus;
}
