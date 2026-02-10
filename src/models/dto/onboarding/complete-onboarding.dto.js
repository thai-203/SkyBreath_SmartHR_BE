import { IsInt, IsString, IsOptional, IsBoolean, Min, Max, Decimal } from 'class-validator';

export class CompleteOnboardingDto {
    @IsInt({ message: 'Progress ID must be an integer' })
    progressId;

    @IsOptional()
    @IsString({ message: 'Final comments must be a string' })
    finalComments;

    @IsOptional()
    @IsInt({ message: 'Overall rating must be an integer' })
    @Min(1, { message: 'Overall rating must be at least 1' })
    @Max(5, { message: 'Overall rating cannot exceed 5' })
    overallRating;

    @IsOptional()
    @IsBoolean({ message: 'Is approved must be a boolean' })
    isApproved = false;
}
