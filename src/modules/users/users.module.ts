import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserEntity, RoleEntity } from './entities';
import { UsersController, RolesController } from './controllers';
import { UsersService, RolesService } from './services';
import { UsersRepository, RolesRepository } from './repositories';

@Module({
    imports: [TypeOrmModule.forFeature([UserEntity, RoleEntity])],
    controllers: [UsersController, RolesController],
    providers: [UsersService, RolesService, UsersRepository, RolesRepository],
    exports: [UsersService, RolesService, UsersRepository, RolesRepository],
})
export class UsersModule { }
