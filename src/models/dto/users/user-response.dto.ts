import { Exclude, Expose, Type } from 'class-transformer';
import { UserRoleEntity } from '../../entities/user-role.entity';

@Exclude()
export class UserResponseDto {
    @Expose()
    id: number;

    @Expose()
    username: string;

    @Expose()
    email: string;

    @Expose()
    status: string;

    @Expose()
    lastLoginTime: Date;

    @Expose()
    createdAt: Date;

    @Expose()
    updatedAt: Date;

    @Expose()
    @Type(() => UserRoleEntity)
    userRoles: UserRoleEntity[];
}
