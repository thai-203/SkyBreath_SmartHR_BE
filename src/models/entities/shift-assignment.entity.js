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

  @Column({ name: 'shift_id', type: 'int' })
  shiftId;

  @Column({ name: 'effective_from', type: 'date', nullable: true })
  effectiveFrom;

  @Column({ name: 'effective_to', type: 'date', nullable: true })
  effectiveTo;

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
