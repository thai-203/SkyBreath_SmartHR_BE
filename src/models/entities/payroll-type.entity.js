import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { DepartmentEntity } from './department.entity.js';
import { PositionEntity } from './position.entity.js';
import { UserEntity } from './user.entity.js';

@Entity('payroll_types')
export class PayrollTypeEntity extends BaseEntity {
    @Column({ name: 'payroll_type_code', type: 'varchar', length: 50, unique: true })
    payrollTypeCode;

    @Column({ type: 'varchar', length: 255 })
    name;

    @Column({ type: 'varchar', length: 100, unique: true })
    keyword;

    @Column({ type: 'text', nullable: true })
    description;

    @Column({ name: 'department_id', type: 'int', nullable: true })
    departmentId;

    @Column({ name: 'position_id', type: 'int', nullable: true })
    positionId;

    @Column({ name: 'created_by_id', type: 'int' })
    createdById;

    @ManyToOne(() => DepartmentEntity)
    @JoinColumn({ name: 'department_id' })
    department;

    @ManyToOne(() => PositionEntity)
    @JoinColumn({ name: 'position_id' })
    position;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'created_by_id' })
    creator;
}
