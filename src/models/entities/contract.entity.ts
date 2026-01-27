import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { EmployeeEntity } from './employee.entity';

@Entity('contracts')
export class ContractEntity extends BaseEntity {
    @Column({ name: 'employee_id' })
    employeeId: number;

    @Column({ name: 'contract_number' })
    contractNumber: string;

    @Column({ name: 'contract_type', nullable: true })
    contractType: string;

    @Column({ name: 'start_date', type: 'date', nullable: true })
    startDate: Date;

    @Column({ name: 'end_date', type: 'date', nullable: true })
    endDate: Date;

    @Column({ name: 'working_hours', nullable: true })
    workingHours: number;

    @Column({ name: 'contract_status', nullable: true })
    contractStatus: string;

    @Column({ name: 'signed_date', type: 'date', nullable: true })
    signedDate: Date;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'employee_id' })
    employee: EmployeeEntity;
}
