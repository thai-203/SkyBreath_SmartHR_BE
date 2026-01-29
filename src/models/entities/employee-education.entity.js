import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { EmployeeEntity } from './employee.entity.js';

@Entity('employee_educations')
export class EmployeeEducationEntity extends BaseEntity {
    @Column({ name: 'employee_id', type: 'int' })
    employeeId;

    @Column({ name: 'start_date', type: 'date', nullable: true })
    startDate;

    @Column({ name: 'end_date', type: 'date', nullable: true })
    endDate;

    @Column({ name: 'education_type', nullable: true, type: 'varchar' })
    educationType;

    @Column({ nullable: true, type: 'varchar' })
    major;

    @Column({ nullable: true, type: 'varchar' })
    degree;

    @Column({ name: 'institution_name', nullable: true, type: 'varchar' })
    institutionName;

    @Column({ name: 'certificate_file_path', nullable: true, type: 'varchar' })
    certificateFilePath;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'employee_id' })
    employee;
}
