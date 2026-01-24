import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose, Type } from 'class-transformer';

class RoleResponseDto {
    @Expose()
    @ApiProperty()
    id: string;

    @Expose()
    @ApiProperty()
    name: string;
}

@Exclude()
export class UserResponseDto {
    @Expose()
    @ApiProperty()
    id: string;

    @Expose()
    @ApiProperty()
    email: string;

    @Expose()
    @ApiProperty()
    firstName: string;

    @Expose()
    @ApiProperty()
    lastName: string;

    @Expose()
    @ApiProperty()
    isActive: boolean;

    @Expose()
    @ApiProperty()
    isEmailVerified: boolean;

    @Expose()
    @ApiProperty({ type: [RoleResponseDto] })
    @Type(() => RoleResponseDto)
    roles: RoleResponseDto[];

    @Expose()
    @ApiProperty()
    createdAt: Date;

    @Expose()
    @ApiProperty()
    updatedAt: Date;
}
