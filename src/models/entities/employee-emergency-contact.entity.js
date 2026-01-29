import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { EmployeeEntity } from './employee.entity.js';

@Entity('employee_emergency_contacts')
export class EmployeeEmergencyContactEntity extends BaseEntity {
    @Column({ name: 'employee_id', type: 'int' })
    employeeId;

    @Column({ name: 'contact_name', type: 'varchar' })
    contactName;

    @Column({ nullable: true, type: 'varchar' })
    relationship;

    @Column({ name: 'phone_number', nullable: true, type: 'varchar' })
    phoneNumber;

    @Column({ nullable: true, type: 'varchar' })
    email;

    @Column({ nullable: true, type: 'varchar' })
    address;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'employee_id' })
    employee;
}
