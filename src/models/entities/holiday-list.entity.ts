import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

@Entity('holiday_list')
export class HolidayListEntity extends BaseEntity {
    @Column({ name: 'holiday_name' })
    holidayName: string;

    @Column({ name: 'holiday_date', type: 'date' })
    holidayDate: Date;

    @Column({ nullable: true })
    description: string;
}
