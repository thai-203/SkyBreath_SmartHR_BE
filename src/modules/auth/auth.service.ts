import {
    Injectable,
    UnauthorizedException,
    ConflictException,
    BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/services';
import { UsersRepository, RolesRepository } from '../users/repositories';
import { RegisterDto, ChangePasswordDto } from './dto';
import { UserEntity } from '../users/entities';
import { hashPassword, comparePassword } from '../../common/utils';
import { ErrorCodes } from '../../common/constants';
import { Role } from '../../common/enums';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly usersRepository: UsersRepository,
        private readonly rolesRepository: RolesRepository,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    async validateUser(
        email: string,
        password: string,
    ): Promise<UserEntity | null> {
        const user = await this.usersService.findByEmail(email);

        if (!user) {
            return null;
        }

        const isPasswordValid = await comparePassword(password, user.password);

        if (!isPasswordValid) {
            return null;
        }

        if (!user.isActive) {
            throw new UnauthorizedException({
                message: 'User account is inactive',
                errorCode: ErrorCodes.USER_INACTIVE,
            });
        }

        return user;
    }

    async login(user: UserEntity) {
        const tokens = await this.generateTokens(user);

        await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);
        await this.usersService.updateLastLogin(user.id);

        return {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                roles: user.roleNames,
            },
            ...tokens,
        };
    }

    async register(registerDto: RegisterDto) {
        const existingUser = await this.usersService.findByEmail(registerDto.email);

        if (existingUser) {
            throw new ConflictException({
                message: 'Email already exists',
                errorCode: ErrorCodes.USER_ALREADY_EXISTS,
            });
        }

        const hashedPassword = await hashPassword(registerDto.password);

        const defaultRole = await this.rolesRepository.findByName(Role.EMPLOYEE);

        const user = await this.usersRepository.create({
            email: registerDto.email,
            password: hashedPassword,
            firstName: registerDto.firstName,
            lastName: registerDto.lastName,
            roles: defaultRole ? [defaultRole] : [],
        });

        const tokens = await this.generateTokens(user);
        await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

        return {
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
            },
            ...tokens,
        };
    }

    async refreshTokens(userId: string, refreshToken: string) {
        const user = await this.usersService.findById(userId);

        if (!user || !user.refreshToken) {
            throw new UnauthorizedException('Access denied');
        }

        if (user.refreshToken !== refreshToken) {
            throw new UnauthorizedException('Access denied');
        }

        const tokens = await this.generateTokens(user);
        await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

        return tokens;
    }

    async logout(userId: string) {
        await this.usersService.updateRefreshToken(userId, null);
        return { message: 'Logged out successfully' };
    }

    async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
        const user = await this.usersService.findById(userId);

        const isPasswordValid = await comparePassword(
            changePasswordDto.currentPassword,
            user.password,
        );

        if (!isPasswordValid) {
            throw new BadRequestException({
                message: 'Current password is incorrect',
                errorCode: ErrorCodes.USER_INVALID_PASSWORD,
            });
        }

        const hashedPassword = await hashPassword(changePasswordDto.newPassword);
        await this.usersRepository.update(userId, { password: hashedPassword });

        return { message: 'Password changed successfully' };
    }

    async getProfile(userId: string) {
        const user = await this.usersService.findById(userId);
        return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            roles: user.roleNames,
            isEmailVerified: user.isEmailVerified,
            lastLoginAt: user.lastLoginAt,
        };
    }

    private async generateTokens(user: UserEntity) {
        const payload = {
            sub: user.id,
            email: user.email,
            roles: user.roleNames,
        };

        const secret = this.configService.get<string>('jwt.secret');
        const refreshSecret = this.configService.get<string>('jwt.refreshSecret');
        const expiresIn = this.configService.get<string>('jwt.expiresIn') || '15m';
        const refreshExpiresIn = this.configService.get<string>('jwt.refreshExpiresIn') || '7d';

        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload as any, {
                secret,
                expiresIn: expiresIn as any,
            }),
            this.jwtService.signAsync(payload as any, {
                secret: refreshSecret,
                expiresIn: refreshExpiresIn as any,
            }),
        ]);

        return {
            accessToken,
            refreshToken,
        };
    }
}
