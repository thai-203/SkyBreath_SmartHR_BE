import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { DepartmentTransferEntity } from './department-transfer.entity.js';
import { EmployeeEntity } from './employee.entity.js';

@Entity('department_transfer_details')
export class DepartmentTransferDetailEntity extends BaseEntity {
    @Column({ name: 'transfer_id', type: 'int' })
    transferId;

    @ManyToOne(() => DepartmentTransferEntity, transfer => transfer.details)
    @JoinColumn({ name: 'transfer_id' })
    transfer;

    @Column({ name: 'employee_id', type: 'int' })
    employeeId;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'employee_id' })
    employee;

    @Column({ name: 'previous_position_id', type: 'int', nullable: true })
    previousPositionId;

    @Column({ name: 'previous_direct_manager_id', type: 'int', nullable: true })
    previousDirectManagerId;
}
