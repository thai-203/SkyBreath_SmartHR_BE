import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';

@Entity('holiday_configs')
export class HolidayConfigEntity extends BaseEntity {
    @Column({ name: 'is_paid_by_default', type: 'boolean', default: false })
    isPaidByDefault;

    @Column({ name: 'compensatory_working_days_enabled', type: 'boolean', default: false })
    compensatoryWorkingDaysEnabled;

    @Column({ name: 'holiday_reminder_policy', type: 'text', nullable: true })
    holidayReminderPolicy;

    @Column({ name: 'default_holiday_group_id', type: 'int', nullable: true })
    defaultHolidayGroupId;

    @Column({ name: 'reminders_enabled', type: 'boolean', default: true })
    remindersEnabled;

    @Column({ name: 'reminder_lead_time', type: 'int', default: 1 })
    reminderLeadTime;

    @Column({ name: 'reminder_channels', type: 'json', nullable: true })
    reminderChannels;

    @Column({ name: 'reminder_recipients', type: 'json', nullable: true })
    reminderRecipients;

    @Column({ name: 'reminder_holiday_types', type: 'json', nullable: true })
    reminderHolidayTypes;
}
