import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateRoleDto {
    @ApiProperty({ example: 'admin' })
    @IsString()
    @MaxLength(50)
    name: string;

    @ApiPropertyOptional({ example: 'Administrator role' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    description?: string;
}
