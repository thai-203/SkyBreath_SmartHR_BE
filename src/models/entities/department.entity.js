import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { EmployeeEntity } from './employee.entity.js';
import { HolidayGroupEntity } from './holiday-group.entity.js';

@Entity('departments')
export class DepartmentEntity extends BaseEntity {
    @Column({ name: 'department_name', type: 'varchar' })
    departmentName;

    @Column({ name: 'parent_department_id', nullable: true, type: 'int' })
    parentDepartmentId;

    @Column({ name: 'manager_employee_id', nullable: true, type: 'int' })
    managerEmployeeId;

    @ManyToOne(() => DepartmentEntity, { nullable: true })
    @JoinColumn({ name: 'parent_department_id' })
    parentDepartment;

    @ManyToOne(() => EmployeeEntity, { nullable: true })
    @JoinColumn({ name: 'manager_employee_id' })
    manager;

    @Column({ name: 'holiday_group_id', nullable: true, type: 'int' })
    holidayGroupId;

    @ManyToOne(() => HolidayGroupEntity, { nullable: true })
    @JoinColumn({ name: 'holiday_group_id' })
    holidayGroup;
}
