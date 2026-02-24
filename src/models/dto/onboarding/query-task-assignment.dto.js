import {
  IsOptional,
  IsInt
} from 'class-validator';
import { Type } from 'class-transformer';

export class QueryTaskAssignmentDto {

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  progressId;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  assignedToEmployeeId;
}
