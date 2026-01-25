import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { EmployeeEntity } from './employee.entity';
import { WorkingShiftEntity } from './working-shift.entity';

@Entity('shift_assignments')
export class ShiftAssignmentEntity extends BaseEntity {
    @Column({ name: 'employee_id' })
    employeeId: number;

    @Column({ name: 'shift_id' })
    shiftId: number;

    @Column({ name: 'effective_from', type: 'date', nullable: true })
    effectiveFrom: Date;

    @Column({ name: 'effective_to', type: 'date', nullable: true })
    effectiveTo: Date;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'employee_id' })
    employee: EmployeeEntity;

    @ManyToOne(() => WorkingShiftEntity)
    @JoinColumn({ name: 'shift_id' })
    shift: WorkingShiftEntity;
}
