import { IsString, IsOptional, IsInt, IsBoolean, Min, Max, Length } from 'class-validator';

export class UpdateOnboardingPlanDto {
    @IsOptional()
    @IsString({ message: 'Plan name must be a string' })
    @Length(3, 255, { message: 'Plan name must be between 3 and 255 characters' })
    planName;

    @IsOptional()
    @IsString({ message: 'Description must be a string' })
    description;

    @IsOptional()
    @IsInt({ message: 'Duration days must be an integer' })
    @Min(1, { message: 'Duration days must be at least 1' })
    @Max(365, { message: 'Duration days cannot exceed 365' })
    durationDays;

    @IsOptional()
    @IsInt({ message: 'Department ID must be an integer' })
    departmentId;

    @IsOptional()
    @IsInt({ message: 'Position ID must be an integer' })
    positionId;

    @IsOptional()
    @IsString({ message: 'Status must be a string' })
    status;

    @IsOptional()
    @IsBoolean({ message: 'Is template must be a boolean' })
    isTemplate;
}
