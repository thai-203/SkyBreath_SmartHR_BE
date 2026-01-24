import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class IdParamDto {
    @ApiProperty({ description: 'UUID of the resource' })
    @IsUUID()
    id: string;
}
