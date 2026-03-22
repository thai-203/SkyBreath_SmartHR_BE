import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { HolidayListEntity } from './holiday-list.entity.js';

@Entity('holiday_groups')
export class HolidayGroupEntity extends BaseEntity {
    @Column({ name: 'group_name', type: 'varchar' })
    groupName;

    @Column({ name: 'group_code', type: 'varchar', unique: true })
    groupCode;

    @Column({ name: 'year', type: 'int' })
    year;

    @Column({ name: 'applicable_scope', type: 'varchar', default: 'GLOBAL' })
    applicableScope;

    @Column({ name: 'status', type: 'varchar', default: 'ACTIVE' })
    status;

    @Column({ name: 'description', nullable: true, type: 'varchar' })
    description;

    @OneToMany(() => HolidayListEntity, (holiday) => holiday.holidayGroup)
    holidays;
}
