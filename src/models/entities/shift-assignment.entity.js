import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { EmployeeEntity } from './employee.entity.js';
import { WorkingShiftEntity } from './working-shift.entity.js';
import { DepartmentEntity } from './department.entity.js';

@Entity('shift_assignments')
export class ShiftAssignmentEntity extends BaseEntity {
  @Column({ name: 'employee_id', type: 'int', nullable: true })
  employeeId;

  @Column({ name: 'department_id', type: 'int', nullable: true })
  departmentId;

  // also store original arrays for metadata
  @Column({ name: 'employee_ids', type: 'simple-array', nullable: true })
  employeeIds;

  @Column({ name: 'department_ids', type: 'simple-array', nullable: true })
  departmentIds;

  @Column({ name: 'shift_id', type: 'int' })
  shiftId;

  @Column({ name: 'effective_from', type: 'date', nullable: true })
  effectiveFrom;

  @Column({ name: 'effective_to', type: 'date', nullable: true })
  effectiveTo;

  // array of numbers 1-7 representing days of week (Monday=1,...Sunday=7)
  @Column({ name: 'weekdays', type: 'simple-array', nullable: true })
  weekdays;

  // repeat pattern: 'weekly', '2weeks', 'monthly', etc.
  @Column({ name: 'repeat_type', type: 'varchar', length: 20, nullable: true })
  repeatType;

  @ManyToOne(() => EmployeeEntity)
  @JoinColumn({ name: 'employee_id' })
  employee;

  @ManyToOne(() => DepartmentEntity)
  @JoinColumn({ name: 'department_id' })
  department;

  @ManyToOne(() => WorkingShiftEntity)
  @JoinColumn({ name: 'shift_id' })
  shift;
}
