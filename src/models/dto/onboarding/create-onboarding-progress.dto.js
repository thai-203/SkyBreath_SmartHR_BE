import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateOnboardingProgressDto {
    @IsInt({ message: 'Employee ID must be an integer' })
    employeeId;

    @IsInt({ message: 'Plan ID must be an integer' })
    planId;

    @IsOptional()
    @IsString({ message: 'Start date must be a valid date string' })
    startDate;

    @IsOptional()
    @IsInt({ message: 'Assigned mentor ID must be an integer' })
    assignedMentorId;
}
