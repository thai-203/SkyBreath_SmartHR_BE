import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';

@Entity('job_grades')
export class JobGradeEntity extends BaseEntity {
  @Column({ name: 'grade_name', type: 'varchar' })
  gradeName;

  @Column({ name: 'min_salary', type: 'decimal', precision: 15, scale: 2 })
  minSalary;

  @Column({ name: 'max_salary', type: 'decimal', precision: 15, scale: 2 })
  maxSalary;
}
