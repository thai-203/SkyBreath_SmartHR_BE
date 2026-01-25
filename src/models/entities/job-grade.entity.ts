import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { DepartmentEntity } from './department.entity';

@Entity('job_grades')
export class JobGradeEntity extends BaseEntity {
    @Column({ name: 'department_id' })
    departmentId: number;

    @Column({ name: 'grade_name' })
    gradeName: string;

    @Column({ name: 'min_salary', type: 'decimal', precision: 15, scale: 2 })
    minSalary: number;

    @Column({ name: 'max_salary', type: 'decimal', precision: 15, scale: 2 })
    maxSalary: number;

    @ManyToOne(() => DepartmentEntity)
    @JoinColumn({ name: 'department_id' })
    department: DepartmentEntity;
}
