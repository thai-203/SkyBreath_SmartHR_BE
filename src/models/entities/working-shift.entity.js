import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { ShiftGroupEntity } from './shift-group.entity.js';

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

    @Column({ name: 'group_id', type: 'int', nullable: true })
    groupId;

    @ManyToOne(() => ShiftGroupEntity, group => group.shifts)
    @JoinColumn({ name: 'group_id' })
    group;
}
