import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { RolesService } from '../services';
import { CreateRoleDto, UpdateRoleDto } from '../dto/role';
import { IdParamDto } from '../../../common/dto';
import { JwtAuthGuard, RolesGuard } from '../../../common/guards';
import { Roles } from '../../../common/decorators';
import { Role } from '../../../common/enums';

@ApiTags('Roles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('roles')
export class RolesController {
    constructor(private readonly rolesService: RolesService) { }

    @Post()
    @Roles(Role.SUPER_ADMIN)
    @ApiOperation({ summary: 'Create a new role' })
    @ApiResponse({ status: 201, description: 'Role created successfully' })
    async create(@Body() createRoleDto: CreateRoleDto) {
        return this.rolesService.create(createRoleDto);
    }

    @Get()
    @Roles(Role.SUPER_ADMIN, Role.ADMIN)
    @ApiOperation({ summary: 'Get all roles' })
    async findAll() {
        return this.rolesService.findAll();
    }

    @Get(':id')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN)
    @ApiOperation({ summary: 'Get role by ID' })
    async findOne(@Param() params: IdParamDto) {
        return this.rolesService.findById(params.id);
    }

    @Patch(':id')
    @Roles(Role.SUPER_ADMIN)
    @ApiOperation({ summary: 'Update role' })
    async update(
        @Param() params: IdParamDto,
        @Body() updateRoleDto: UpdateRoleDto,
    ) {
        return this.rolesService.update(params.id, updateRoleDto);
    }

    @Delete(':id')
    @Roles(Role.SUPER_ADMIN)
    @ApiOperation({ summary: 'Delete role' })
    async remove(@Param() params: IdParamDto) {
        await this.rolesService.remove(params.id);
        return { message: 'Role deleted successfully' };
    }
}
