import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';

@Entity('holiday_list')
export class HolidayListEntity extends BaseEntity {
    @Column({ name: 'holiday_name', type: 'varchar' })
    holidayName;

    @Column({ name: 'holiday_date', type: 'date' })
    holidayDate;

    @Column({ nullable: true, type: 'varchar' })
    description;
}
