import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { EmployeeEntity } from './employee.entity';

@Entity('departments')
export class DepartmentEntity extends BaseEntity {
    @Column({ name: 'department_name' })
    departmentName: string;

    @Column({ name: 'parent_department_id', nullable: true })
    parentDepartmentId: number;

    @Column({ name: 'manager_employee_id', nullable: true })
    managerEmployeeId: number;

    @ManyToOne(() => DepartmentEntity, { nullable: true })
    @JoinColumn({ name: 'parent_department_id' })
    parentDepartment: DepartmentEntity;

    // Circular dependency with EmployeeEntity (Manager), handled by forwardRef or simple ID reference if needed.
    // For now, we define the relation.
    @ManyToOne(() => EmployeeEntity, { nullable: true })
    @JoinColumn({ name: 'manager_employee_id' })
    manager: EmployeeEntity;
}
