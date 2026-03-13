import { Column, Entity, ManyToMany, JoinTable } from 'typeorm';
import { EmployeeEntity } from './employee.entity.js';
import { BaseEntity } from '../../common/entities/base.entity.js';

@Entity('holiday_list')
export class HolidayListEntity extends BaseEntity {
  @Column({ name: 'holiday_name', type: 'varchar' })
  holidayName;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate;

  @Column({ name: 'holiday_type', type: 'varchar', nullable: true })
  holidayType;

  @Column({ name: 'is_paid', type: 'boolean', default: false })
  isPaid;

  @Column({ name: 'updated_by', type: 'varchar', nullable: true })
  updatedBy;

  @Column({ nullable: true, type: 'varchar' })
  description;

  @ManyToMany(() => EmployeeEntity)
  @JoinTable({
    name: 'holiday_employees',
    joinColumn: { name: 'holiday_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'employee_id', referencedColumnName: 'id' }
  })
  employees;
}
