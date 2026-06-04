import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { EmployeeEntity } from './employee.entity.js';
import { DepartmentEntity } from './department.entity.js';
import { PositionEntity } from './position.entity.js';
import { JobGradeEntity } from './job-grade.entity.js';

@Entity('contracts')
export class ContractEntity extends BaseEntity {
  @Column({ name: 'employee_id', type: 'int' })
  employeeId;

  @Column({ name: 'department_id', type: 'int', nullable: true })
  departmentId;

  @Column({ name: 'department_name', type: 'varchar', nullable: true })
  departmentName;

  @ManyToOne(() => DepartmentEntity, { nullable: true })
  @JoinColumn({ name: 'department_id' })
  department;

  @Column({ name: 'position_id', type: 'int', nullable: true })
  positionId;

  @Column({ name: 'position_name', type: 'varchar', nullable: true })
  positionName;

  @ManyToOne(() => PositionEntity, { nullable: true })
  @JoinColumn({ name: 'position_id' })
  position;

  @Column({ name: 'job_grade_id', type: 'int', nullable: true })
  jobGradeId;

  @Column({ name: 'job_grade_name', type: 'varchar', nullable: true })
  jobGradeName;

  @ManyToOne(() => JobGradeEntity, { nullable: true })
  @JoinColumn({ name: 'job_grade_id' })
  jobGrade;

  @Column({ name: 'contract_number', type: 'varchar' })
  contractNumber;

  @Column({ name: 'contract_type', type: 'varchar', nullable: true })
  contractType;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate;

  @Column({
    name: 'working_hours',
    type: 'decimal',
    precision: 5,
    scale: 2,
    nullable: true,
  })
  workingHours;

  @Column({ name: 'contract_status', type: 'varchar', nullable: true })
  contractStatus;

  @Column({ name: 'signed_date', type: 'date', nullable: true })
  signedDate;

  /* =======================
       TERMINATION INFORMATION
       ======================= */

  @Column({ name: 'termination_date', type: 'date', nullable: true })
  terminationDate;

  @Column({ name: 'termination_reason', type: 'varchar', nullable: true })
  terminationReason;

  @Column({
    name: 'termination_compensation',
    type: 'decimal',
    precision: 15,
    scale: 2,
    nullable: true,
    default: 0,
  })
  terminationCompensation;

  @Column({ name: 'termination_note', type: 'text', nullable: true })
  terminationNote;

  @Column({
    name: 'terminated_at',
    type: 'datetime',
    precision: 6,
    nullable: true,
  })
  terminatedAt;

  @Column({ name: 'terminated_by', type: 'int', nullable: true })
  terminatedBy;

  @Column({ type: 'json', nullable: true })
  attachments;

  @Column({ name: 'note', type: 'text', nullable: true })
  note;

  /* =======================
       RELATIONS
       ======================= */

  @ManyToOne(() => EmployeeEntity)
  @JoinColumn({ name: 'employee_id' })
  employee;
}
