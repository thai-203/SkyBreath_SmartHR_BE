import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { EmployeeEntity } from './employee.entity.js';

@Entity('payroll_configs')
export class PayrollConfigEntity extends BaseEntity {
    @Column({ name: 'approver1_id', type: 'int', nullable: true })
    approver1Id;

    @Column({ name: 'approver2_id', type: 'int', nullable: true })
    approver2Id;

    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'approver1_id' })
    approver1;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'approver2_id' })
    approver2;

    @Column({ name: 'config_key', type: 'varchar', length: 100, default: 'GENERAL' })
    configKey;
}
