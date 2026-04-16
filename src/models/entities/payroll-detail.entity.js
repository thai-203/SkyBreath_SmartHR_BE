import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity.js';
import { PayrollEntity } from './payroll.entity.js';
import { EmployeeEntity } from './employee.entity.js';

@Entity('payroll_details')
export class PayrollDetailEntity extends BaseEntity {
    @Column({ name: 'payroll_id', type: 'int' })
    payrollId;

    @Column({ name: 'employee_id', type: 'int' })
    employeeId;

    @Column({ name: 'working_days', type: 'decimal', precision: 5, scale: 2, default: 0 })
    workingDays;

    @Column({ name: 'base_salary', type: 'decimal', precision: 15, scale: 2 })
    baseSalary;

    @Column({ name: 'overtime_pay', type: 'decimal', precision: 15, scale: 2, default: 0 })
    overtimePay;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    bonus;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    penalty;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    deduction;

    @Column({ name: 'allowance_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
    allowanceAmount;

    @Column({ name: 'net_salary', type: 'decimal', precision: 15, scale: 2 })
    netSalary;

    @Column({ name: 'insurance_deduction', type: 'decimal', precision: 15, scale: 2, default: 0 })
    insuranceDeduction;

    @Column({ name: 'tax_deduction', type: 'decimal', precision: 15, scale: 2, default: 0 })
    taxDeduction;

    // --- Granular timesheet snapshot fields ---
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

    @Column({ name: 'ot_weekday', type: 'decimal', precision: 5, scale: 2, default: 0 })
    otWeekday;

    @Column({ name: 'ot_weekday_night', type: 'decimal', precision: 5, scale: 2, default: 0 })
    otWeekdayNight;

    @Column({ name: 'ot_weekend', type: 'decimal', precision: 5, scale: 2, default: 0 })
    otWeekend;

    @Column({ name: 'ot_weekend_night', type: 'decimal', precision: 5, scale: 2, default: 0 })
    otWeekendNight;

    @Column({ name: 'ot_holiday', type: 'decimal', precision: 5, scale: 2, default: 0 })
    otHoliday;

    @Column({ name: 'ot_holiday_night', type: 'decimal', precision: 5, scale: 2, default: 0 })
    otHolidayNight;

    @Column({ name: 'total_ot_hours', type: 'decimal', precision: 5, scale: 2, default: 0 })
    totalOtHours;

    @Column({ name: 'p1_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
    p1Amount;

    @Column({ name: 'p21_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
    p21Amount;

    @Column({ name: 'p22_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
    p22Amount;

    @Column({ name: 'probation_amount', type: 'decimal', precision: 15, scale: 2, default: 0 })
    probationAmount;

    @Column({ name: 'p1p2_percentage', type: 'decimal', precision: 5, scale: 2, default: 0 })
    p1p2Percentage;

    @Column({ name: 'p3_percentage', type: 'decimal', precision: 5, scale: 2, default: 0 })
    p3Percentage;

    @Column({ name: 'social_insurance', type: 'decimal', precision: 15, scale: 2, default: 0 })
    socialInsurance;

    @Column({ name: 'health_insurance', type: 'decimal', precision: 15, scale: 2, default: 0 })
    healthInsurance;

    @Column({ name: 'unemployment_insurance', type: 'decimal', precision: 15, scale: 2, default: 0 })
    unemploymentInsurance;

    @Column({ name: 'union_fee', type: 'decimal', precision: 15, scale: 2, default: 0 })
    unionFee;

    @Column({ name: 'party_fee', type: 'decimal', precision: 15, scale: 2, default: 0 })
    partyFee;

    @Column({ name: 'charity_fee', type: 'decimal', precision: 15, scale: 2, default: 0 })
    charityFee;

    @Column({ name: 'taxable_income_paid', type: 'decimal', precision: 15, scale: 2, default: 0 })
    taxableIncomePaid;

    @Column({ name: 'other_taxable_income', type: 'decimal', precision: 15, scale: 2, default: 0 })
    otherTaxableIncome;

    @Column({ name: 'other_non_taxable_income', type: 'decimal', precision: 15, scale: 2, default: 0 })
    otherNonTaxableIncome;

    @Column({ name: 'company_union_fee', type: 'decimal', precision: 15, scale: 2, default: 0 })
    companyUnionFee;

    @Column({ name: 'company_social_insurance', type: 'decimal', precision: 15, scale: 2, default: 0 })
    companySocialInsurance;

    @Column({ name: 'company_health_insurance', type: 'decimal', precision: 15, scale: 2, default: 0 })
    companyHealthInsurance;

    @Column({ name: 'company_unemployment_insurance', type: 'decimal', precision: 15, scale: 2, default: 0 })
    companyUnemploymentInsurance;

    @Column({ name: 'total_hr_cost', type: 'decimal', precision: 15, scale: 2, default: 0 })
    totalHrCost;
    // ------------------------------------------

    @Column({ name: 'note', type: 'text', nullable: true })
    note;

    @Column({ name: 'payslip_sent_at', type: 'datetime', nullable: true })
    payslipSentAt;

    @ManyToOne(() => PayrollEntity)
    @JoinColumn({ name: 'payroll_id' })
    payroll;

    @ManyToOne(() => EmployeeEntity)
    @JoinColumn({ name: 'employee_id' })
    employee;
}
