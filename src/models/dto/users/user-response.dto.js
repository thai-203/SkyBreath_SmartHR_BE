import { Exclude, Expose, Type } from 'class-transformer';
import { UserRoleEntity } from '../../entities/user-role.entity.js';

@Exclude()
export class UserResponseDto {
    @Expose()
    id;

    @Expose()
    username;

    @Expose()
    email;

    @Expose()
    status;

    @Expose()
    lastLoginTime;

    @Expose()
    createdAt;

    @Expose()
    updatedAt;

    @Expose()
    @Type(() => UserRoleEntity)
    userRoles;
}
