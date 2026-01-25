import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { EmployeeEntity } from './employee.entity';

@Entity('employee_dependents')
export class EmployeeDependentEntity extends BaseEntity {
    @Column({ name: 'employee_id' })
    employeeId: number;

    @Column({ nullable: true })
    relationship: string;

    @Column({ name: 'full_name' })
    fullName: string;

    @Column({ name: 'date_of_birth', type: 'date', nullable: true })
    dateOfBirth: Date;

    @Column({ nullable: true })
    gender: string;

    @Column({ name: 'phone_number', nullable: true })
    phoneNumber: string;

    @Column({ name: 'national_id', nullable: true })
    nationalId: string;

    @Column({ name: 'national_id_issued_date', type: 'date', nullable: true })
    nationalIdIssuedDate: Date;

    @Column({ name: 'national_id_issued_place', nullable: true })
    nationalIdIssuedPlace: string;

    @Column({ name: 'is_dependent', default: false })
    isDependent: boolean;

    @Column({ name: 'dependent_from', type: 'date', nullable: true })
    dependentFrom: Date;

    @Column({ name: 'dependent_to', type: 'date', nullable: true })
    dependentTo: Date;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'employee_id' })
    employee: EmployeeEntity;
}
