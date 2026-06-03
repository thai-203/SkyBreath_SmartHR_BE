import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { DepartmentEntity } from './department.entity.js';
import { UserEntity } from './user.entity.js';
import { DepartmentTransferDetailEntity } from './department-transfer-detail.entity.js';

@Entity('department_transfers')
export class DepartmentTransferEntity extends BaseEntity {
    @Column({ name: 'transfer_code', unique: true, type: 'varchar', length: 50 })
    transferCode;

    @Column({ name: 'from_department_id', type: 'int' })
    fromDepartmentId;

    @ManyToOne(() => DepartmentEntity)
    @JoinColumn({ name: 'from_department_id' })
    fromDepartment;

    @Column({ name: 'to_department_id', type: 'int' })
    toDepartmentId;

    @ManyToOne(() => DepartmentEntity)
    @JoinColumn({ name: 'to_department_id' })
    toDepartment;

    @Column({ type: 'text' })
    reason;

    @Column({ name: 'effective_date', type: 'date' })
    effectiveDate;

    @Column({ type: 'text', nullable: true })
    note;

    @Column({ name: 'transferred_by', type: 'int' })
    transferredBy;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'transferred_by' })
    transferredByUser;

    @Column({ name: 'total_employees', type: 'int' })
    totalEmployees;

    @OneToMany(() => DepartmentTransferDetailEntity, detail => detail.transfer)
    details;
}
