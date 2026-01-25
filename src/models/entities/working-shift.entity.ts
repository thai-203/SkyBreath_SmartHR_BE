import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('working_shifts')
export class WorkingShiftEntity extends BaseEntity {
    @Column({ name: 'shift_name' })
    shiftName: string;

    @Column({ name: 'start_time', type: 'time', nullable: true })
    startTime: string;

    @Column({ name: 'end_time', type: 'time', nullable: true })
    endTime: string;

    @Column({ name: 'break_start_time', type: 'time', nullable: true })
    breakStartTime: string;

    @Column({ name: 'break_end_time', type: 'time', nullable: true })
    breakEndTime: string;
}
