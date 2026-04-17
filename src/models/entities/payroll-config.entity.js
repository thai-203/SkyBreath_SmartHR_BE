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

    @Column({ name: 'social_insurance_rate', type: 'decimal', precision: 5, scale: 2, default: 0.0 })
    socialInsuranceRate;

    @Column({ name: 'health_insurance_rate', type: 'decimal', precision: 5, scale: 2, default: 0.0 })
    healthInsuranceRate;

    @Column({ name: 'unemployment_insurance_rate', type: 'decimal', precision: 5, scale: 2, default: 0.0 })
    unemploymentInsuranceRate;

    @Column({ name: 'union_fee_rate', type: 'decimal', precision: 5, scale: 2, default: 0.0 })
    unionFeeRate;
}
