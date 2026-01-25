import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { EmployeeEntity } from './employee.entity';

@Entity('employee_work_histories')
export class EmployeeWorkHistoryEntity extends BaseEntity {
    @Column({ name: 'employee_id' })
    employeeId: number;

    @Column({ name: 'start_date', type: 'date', nullable: true })
    startDate: Date;

    @Column({ name: 'end_date', type: 'date', nullable: true })
    endDate: Date;

    @Column({ name: 'company_name', nullable: true })
    companyName: string;

    @Column({ name: 'department_name', nullable: true })
    departmentName: string;

    @Column({ name: 'position_name', nullable: true })
    positionName: string;

    @Column({ name: 'reference_person', nullable: true })
    referencePerson: string;

    @Column({ name: 'reference_phone', nullable: true })
    referencePhone: string;

    @Column({ name: 'job_description', type: 'text', nullable: true })
    jobDescription: string;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'employee_id' })
    employee: EmployeeEntity;
}
