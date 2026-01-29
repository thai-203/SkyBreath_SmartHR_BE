import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';

@Entity('working_shifts')
export class WorkingShiftEntity extends BaseEntity {
    @Column({ name: 'shift_name', type: 'varchar' })
    shiftName;

    @Column({ name: 'start_time', type: 'time', nullable: true })
    startTime;

    @Column({ name: 'end_time', type: 'time', nullable: true })
    endTime;

    @Column({ name: 'break_start_time', type: 'time', nullable: true })
    breakStartTime;

    @Column({ name: 'break_end_time', type: 'time', nullable: true })
    breakEndTime;
}
