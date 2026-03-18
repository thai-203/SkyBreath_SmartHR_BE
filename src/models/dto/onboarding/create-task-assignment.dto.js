import {
  IsInt,
  IsOptional,
  IsDateString,
  IsString,
  Min
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTaskAssignmentDto {

  @Type(() => Number)
  @IsInt()
  @Min(1)
  progressId;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  taskId;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  assignedToEmployeeId;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  assignedByUserId;

  @IsOptional()
  @IsDateString()
  assignedDate;

  @IsOptional()
  @IsDateString()
  dueDate;

  @IsOptional()
  @IsDateString()
  completionDate;

  @IsOptional()
  @IsString()
  priority;

  @IsOptional()
  @IsString()
  notes;
}
