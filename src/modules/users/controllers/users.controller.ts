import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Query,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from '../services';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from '../dto/user';
import { IdParamDto, PaginationDto } from '../../../common/dto';
import { JwtAuthGuard, RolesGuard } from '../../../common/guards';
import { Roles, ApiPaginatedResponse } from '../../../common/decorators';
import { Role } from '../../../common/enums';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    @Post()
    @Roles(Role.SUPER_ADMIN, Role.ADMIN)
    @ApiOperation({ summary: 'Create a new user' })
    @ApiResponse({ status: 201, description: 'User created successfully' })
    async create(@Body() createUserDto: CreateUserDto) {
        return this.usersService.create(createUserDto);
    }

    @Get()
    @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.MANAGER)
    @ApiOperation({ summary: 'Get all users' })
    @ApiPaginatedResponse(UserResponseDto)
    async findAll(@Query() paginationDto: PaginationDto) {
        return this.usersService.findAll(paginationDto);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get user by ID' })
    @ApiResponse({ status: 200, type: UserResponseDto })
    async findOne(@Param() params: IdParamDto) {
        return this.usersService.findById(params.id);
    }

    @Patch(':id')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN)
    @ApiOperation({ summary: 'Update user' })
    @ApiResponse({ status: 200, type: UserResponseDto })
    async update(
        @Param() params: IdParamDto,
        @Body() updateUserDto: UpdateUserDto,
    ) {
        return this.usersService.update(params.id, updateUserDto);
    }

    @Delete(':id')
    @Roles(Role.SUPER_ADMIN)
    @ApiOperation({ summary: 'Delete user' })
    @ApiResponse({ status: 200, description: 'User deleted successfully' })
    async remove(@Param() params: IdParamDto) {
        await this.usersService.remove(params.id);
        return { message: 'User deleted successfully' };
    }
}
