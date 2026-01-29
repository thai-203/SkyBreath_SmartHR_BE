import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { EmployeeEntity } from './employee.entity.js';

@Entity('employee_dependents')
export class EmployeeDependentEntity extends BaseEntity {
    @Column({ name: 'employee_id', type: 'int' })
    employeeId;

    @Column({ nullable: true, type: 'varchar' })
    relationship;

    @Column({ name: 'full_name', type: 'varchar' })
    fullName;

    @Column({ name: 'date_of_birth', type: 'date', nullable: true })
    dateOfBirth;

    @Column({ nullable: true, type: 'varchar' })
    gender;

    @Column({ name: 'phone_number', nullable: true, type: 'varchar' })
    phoneNumber;

    @Column({ name: 'national_id', nullable: true, type: 'varchar' })
    nationalId;

    @Column({ name: 'national_id_issued_date', type: 'date', nullable: true })
    nationalIdIssuedDate;

    @Column({ name: 'national_id_issued_place', nullable: true, type: 'varchar' })
    nationalIdIssuedPlace;

    @Column({ name: 'is_dependent', default: false, type: 'boolean' })
    isDependent;

    @Column({ name: 'dependent_from', type: 'date', nullable: true })
    dependentFrom;

    @Column({ name: 'dependent_to', type: 'date', nullable: true })
    dependentTo;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'employee_id' })
    employee;
}
