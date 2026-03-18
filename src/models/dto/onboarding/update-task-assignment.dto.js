import {
  IsOptional,
  IsDateString,
  IsString,
  IsIn
} from 'class-validator';

export const TaskStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
};

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

  @IsOptional()
  @IsIn(
    [TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.COMPLETED],
    { message: 'status chỉ được là: PENDING, IN_PROGRESS, COMPLETED' }
  )
  status;

  @IsOptional()
  @IsString()
  assetCode;

  @IsOptional()
  @IsString()
  evidencePath;
}