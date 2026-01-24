import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsEmail,
    IsString,
    MinLength,
    MaxLength,
    IsOptional,
    IsArray,
    IsUUID,
    IsNotEmpty,
} from 'class-validator';

export class CreateUserDto {
    @ApiProperty({ example: 'user@example.com' })
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'password123', minLength: 6 })
    @IsString()
    @MinLength(6)
    @IsNotEmpty()
    @MaxLength(50)
    password: string;

    @ApiPropertyOptional({ example: 'John' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    firstName?: string;

    @ApiPropertyOptional({ example: 'Doe' })
    @IsString()
    @MaxLength(50)
    @IsNotEmpty()
    lastName?: string;

    @ApiPropertyOptional({ type: [String], description: 'Array of role IDs' })
    @IsOptional()
    @IsArray()
    @IsUUID('4', { each: true })
    roleIds?: string[];
}
