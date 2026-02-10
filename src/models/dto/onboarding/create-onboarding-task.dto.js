import { IsString, IsOptional, IsInt, IsBoolean, Min, Length } from 'class-validator';

export class CreateOnboardingTaskDto {
    @IsInt({ message: 'Plan ID must be an integer' })
    planId;

    @IsString({ message: 'Task title must be a string' })
    @Length(3, 255, { message: 'Task title must be between 3 and 255 characters' })
    taskTitle;

    @IsOptional()
    @IsString({ message: 'Description must be a string' })
    description;

    @IsOptional()
    @IsInt({ message: 'Task order must be an integer' })
    @Min(0, { message: 'Task order must be non-negative' })
    taskOrder = 0;

    @IsOptional()
    @IsBoolean({ message: 'Is mandatory must be a boolean' })
    isMandatory = false;

    @IsOptional()
    @IsInt({ message: 'Estimated days must be an integer' })
    @Min(1, { message: 'Estimated days must be at least 1' })
    estimatedDays;

    @IsOptional()
    @IsString({ message: 'Category must be a string' })
    category;
}
