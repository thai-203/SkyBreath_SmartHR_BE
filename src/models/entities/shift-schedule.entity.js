import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { ShiftAssignmentEntity } from './shift-assignment.entity.js';
import { EmployeeEntity } from './employee.entity.js';
import { DepartmentEntity } from './department.entity.js';
import { WorkingShiftEntity } from './working-shift.entity.js';

@Entity('shift_schedules')
export class ShiftScheduleEntity extends BaseEntity {
  @Column({ name: 'assignment_id', type: 'int' })
  assignmentId;

  @Column({ name: 'employee_id', type: 'int' })
  employeeId;

  @Column({ name: 'department_id', type: 'int', nullable: true })
  departmentId;

  @Column({ name: 'shift_id', type: 'int' })
  shiftId;

  @Column({ name: 'work_date', type: 'date' })
  workDate;

  @ManyToOne(() => ShiftAssignmentEntity)
  @JoinColumn({ name: 'assignment_id' })
  assignment;

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
