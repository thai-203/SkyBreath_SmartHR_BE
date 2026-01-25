import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('payrolls')
export class PayrollEntity extends BaseEntity {
    @Column({ name: 'payroll_month' })
    payrollMonth: number;

    @Column({ name: 'payroll_year' })
    payrollYear: number;

    @Column({ name: 'payroll_status', nullable: true })
    payrollStatus: string;
}
