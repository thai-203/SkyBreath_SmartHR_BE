import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { WorkingShiftEntity } from './working-shift.entity.js';

@Entity('shift_groups')
export class ShiftGroupEntity extends BaseEntity {
    @Column({ name: 'group_name', type: 'varchar' })
    groupName;

    @Column({ name: 'description', type: 'varchar', nullable: true })
    description;

    @OneToMany(() => WorkingShiftEntity, shift => shift.group)
    shifts;
}