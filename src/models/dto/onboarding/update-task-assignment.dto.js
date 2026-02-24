import {
  IsOptional,
  IsDateString,
  IsString
} from 'class-validator';

export class UpdateTaskAssignmentDto {

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
