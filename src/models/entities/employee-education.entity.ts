import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { EmployeeEntity } from './employee.entity';

@Entity('employee_educations')
export class EmployeeEducationEntity extends BaseEntity {
    @Column({ name: 'employee_id' })
    employeeId: number;

    @Column({ name: 'start_date', type: 'date', nullable: true })
    startDate: Date;

    @Column({ name: 'end_date', type: 'date', nullable: true })
    endDate: Date;

    @Column({ name: 'education_type', nullable: true })
    educationType: string;

    @Column({ nullable: true })
    major: string;

    @Column({ nullable: true })
    degree: string;

    @Column({ name: 'institution_name', nullable: true })
    institutionName: string;

    @Column({ name: 'certificate_file_path', nullable: true })
    certificateFilePath: string;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'employee_id' })
    employee: EmployeeEntity;
}
