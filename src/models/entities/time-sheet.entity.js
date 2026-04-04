import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { EmployeeEntity } from './employee.entity.js';

@Entity('time_sheets')
export class TimeSheetEntity extends BaseEntity {
    @Column({ name: 'employee_id', type: 'int' })
    employeeId;

    @Column({ type: 'int' })
    month;

    @Column({ type: 'int' })
    year;

    @Column({ name: 'total_working_days', nullable: true, type: 'decimal', precision: 5, scale: 2 })
    totalWorkingDays;

    @Column({ name: 'total_working_hours', type: 'decimal', precision: 10, scale: 2, nullable: true })
    totalWorkingHours;

    @Column({ name: 'overtime_hours', type: 'decimal', precision: 10, scale: 2, nullable: true })
    overtimeHours;

    // --- Granular tracking fields ---
    @Column({ name: 'standard_days', type: 'decimal', precision: 5, scale: 2, default: 0 })
    standardDays;

    @Column({ name: 'official_days', type: 'decimal', precision: 5, scale: 2, default: 0 })
    officialDays;

    @Column({ name: 'probation_days', type: 'decimal', precision: 5, scale: 2, default: 0 })
    probationDays;

    @Column({ name: 'business_trip_days', type: 'decimal', precision: 5, scale: 2, default: 0 })
    businessTripDays;

    @Column({ name: 'holiday_days', type: 'decimal', precision: 5, scale: 2, default: 0 })
    holidayDays;

    @Column({ name: 'benefit_leave_days', type: 'decimal', precision: 5, scale: 2, default: 0 })
    benefitLeaveDays;

    @Column({ name: 'annual_leave_days', type: 'decimal', precision: 5, scale: 2, default: 0 })
    annualLeaveDays;

    @Column({ name: 'unpaid_leave_days', type: 'decimal', precision: 5, scale: 2, default: 0 })
    unpaidLeaveDays;

    @Column({ name: 'night_shift_official_days', type: 'decimal', precision: 5, scale: 2, default: 0 })
    nightShiftOfficialDays;

    @Column({ name: 'night_shift_probation_days', type: 'decimal', precision: 5, scale: 2, default: 0 })
    nightShiftProbationDays;

    @Column({ name: 'waiting_days', type: 'decimal', precision: 5, scale: 2, default: 0 })
    waitingDays;

    @Column({ name: 'meal_count', type: 'int', default: 0 })
    mealCount;

    @Column({ name: 'used_leave_days', type: 'decimal', precision: 5, scale: 2, default: 0 })
    usedLeaveDays;

    @Column({ name: 'remaining_leave_days', type: 'decimal', precision: 5, scale: 2, default: 0 })
    remainingLeaveDays;
    // --------------------------------

    @Column({ name: 'is_locked', default: false, type: 'boolean' })
    isLocked;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'employee_id' })
    employee;
}
