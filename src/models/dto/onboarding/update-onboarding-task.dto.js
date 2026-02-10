import { IsString, IsOptional, IsInt, IsBoolean, Min, Length } from 'class-validator';

export class UpdateOnboardingTaskDto {
    @IsOptional()
    @IsString({ message: 'Task title must be a string' })
    @Length(3, 255, { message: 'Task title must be between 3 and 255 characters' })
    taskTitle;

    @IsOptional()
    @IsString({ message: 'Description must be a string' })
    description;

    @IsOptional()
    @IsInt({ message: 'Task order must be an integer' })
    @Min(0, { message: 'Task order must be non-negative' })
    taskOrder;

    @IsOptional()
    @IsBoolean({ message: 'Is mandatory must be a boolean' })
    isMandatory;

    @IsOptional()
    @IsInt({ message: 'Estimated days must be an integer' })
    @Min(1, { message: 'Estimated days must be at least 1' })
    estimatedDays;

    @IsOptional()
    @IsString({ message: 'Status must be a string' })
    status;

    @IsOptional()
    @IsString({ message: 'Category must be a string' })
    category;
}
