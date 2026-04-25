import {
    IsInt,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Min,
    Max,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePerformanceReviewDto {
    @IsInt()
    @IsNotEmpty({ message: 'Nhân viên là bắt buộc' })
    @Type(() => Number)
    employeeId;

    @IsInt()
    @Min(1)
    @Max(12)
    @Type(() => Number)
    reviewMonth;

    @IsInt()
    @Min(2000)
    @Type(() => Number)
    reviewYear;

    @IsNumber()
    @Min(0)
    @Max(1, { message: 'Điểm chấp hành nội quy tối đa 1.0' })
    @Type(() => Number)
    scoreCompliance;

    @IsNumber()
    @Min(0)
    @Max(1, { message: 'Điểm thái độ làm việc tối đa 1.0' })
    @Type(() => Number)
    scoreAttitude;

    @IsNumber()
    @Min(0)
    @Max(1, { message: 'Điểm ý thức học hỏi tối đa 1.0' })
    @Type(() => Number)
    scoreLearning;

    @IsNumber()
    @Min(0)
    @Max(1, { message: 'Điểm tinh thần đồng đội tối đa 1.0' })
    @Type(() => Number)
    scoreTeamwork;

    @IsNumber()
    @Min(0)
    @Max(1, { message: 'Điểm kiến thức kỹ năng tối đa 1.0' })
    @Type(() => Number)
    scoreSkills;

    @IsNumber()
    @Min(0)
    @Max(5, { message: 'Điểm kết quả thực hiện tối đa 5.0' })
    @Type(() => Number)
    scoreResult;

    @IsString()
    @IsOptional()
    managerComment;

    @IsString()
    @IsOptional()
    status;
}
