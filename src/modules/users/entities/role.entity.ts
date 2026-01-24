import { Entity, Column, ManyToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities';
import { UserEntity } from './user.entity';

@Entity('roles')
export class RoleEntity extends BaseEntity {
    @Column({ unique: true })
    name: string;

    @Column({ nullable: true })
    description: string;

    @Column({ name: 'is_active', default: true })
    isActive: boolean;

    @ManyToMany(() => UserEntity, (user) => user.roles)
    users: UserEntity[];
}
