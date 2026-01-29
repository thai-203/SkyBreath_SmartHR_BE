import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { EmployeeEntity } from './employee.entity.js';

@Entity('employee_work_histories')
export class EmployeeWorkHistoryEntity extends BaseEntity {
    @Column({ name: 'employee_id', type: 'int' })
    employeeId;

    @Column({ name: 'start_date', type: 'date', nullable: true })
    startDate;

    @Column({ name: 'end_date', type: 'date', nullable: true })
    endDate;

    @Column({ name: 'company_name', nullable: true, type: 'varchar' })
    companyName;

    @Column({ name: 'department_name', nullable: true, type: 'varchar' })
    departmentName;

    @Column({ name: 'position_name', nullable: true, type: 'varchar' })
    positionName;

    @Column({ name: 'reference_person', nullable: true, type: 'varchar' })
    referencePerson;

    @Column({ name: 'reference_phone', nullable: true, type: 'varchar' })
    referencePhone;

    @Column({ name: 'job_description', type: 'text', nullable: true })
    jobDescription;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'employee_id' })
    employee;
}
