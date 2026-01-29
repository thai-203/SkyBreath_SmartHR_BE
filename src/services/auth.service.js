import * as jwt from 'jsonwebtoken';
import { UsersService } from './users.service.js';
import { UsersRepository } from '../repositories/users.repository.js';
import { RolesRepository } from '../repositories/roles.repository.js';
import { hashPassword, comparePassword } from '../common/utils/index.js';
import { AppMessages } from '../common/constants/index.js';
import { UnauthorizedException, BadRequestException, ConflictException, NotFoundException } from '../common/exceptions/index.js';

export class AuthService {
    constructor() {
        this.usersService = new UsersService();
        this.usersRepository = new UsersRepository();
        this.rolesRepository = new RolesRepository();
    }

    async validateUser(email, password) {
        const user = await this.usersService.findByEmailWithPassword(email);

        if (!user) {
            return null;
        }

        const isPasswordValid = await comparePassword(password, user.password);

        if (!isPasswordValid) {
            return null;
        }

        if (user.status !== 'ACTIVE') {
            throw new UnauthorizedException(AppMessages.Errors.User.INACTIVE);
        }

        return user;
    }

    async login(user) {
        const tokens = await this.generateTokens(user);

        await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);
        await this.usersService.updateLastLogin(user.id);

        return {
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                roles: user.userRoles?.map(ur => ur.role.roleName) || [],
            },
            ...tokens,
        };
    }

    async register(registerDto) {
        const existingUser = await this.usersService.findByEmail(registerDto.email);

        if (existingUser) {
            throw new ConflictException(AppMessages.Errors.User.ALREADY_EXISTS);
        }

        const hashedPassword = await hashPassword(registerDto.password);

        const user = await this.usersRepository.create({
            email: registerDto.email,
            username: registerDto.email, // Default username to email
            password: hashedPassword,
            status: 'ACTIVE',
        });

        // TODO: Assign default role using UserRoleEntity

        const tokens = await this.generateTokens(user);
        await this.usersService.updateRefreshToken(user.id, tokens.refreshToken);

        return {
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
            },
            ...tokens,
        };
    }

    async refreshTokens(userId, refreshToken) {
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

    async logout(userId) {
        await this.usersService.updateRefreshToken(userId, null);
        return { message: 'Logged out successfully' };
    }

    async changePassword(userId, changePasswordDto) {
        const user = await this.usersService.findByIdWithPassword(userId);

        if (!user) {
            throw new NotFoundException(AppMessages.Errors.User.NOT_FOUND);
        }

        const isPasswordValid = await comparePassword(
            changePasswordDto.currentPassword,
            user.password,
        );

        if (!isPasswordValid) {
            throw new BadRequestException(AppMessages.Errors.User.INVALID_PASSWORD);
        }

        const hashedPassword = await hashPassword(changePasswordDto.newPassword);
        await this.usersRepository.update(userId, { password: hashedPassword });

        return { message: 'Password changed successfully' };
    }

    async getProfile(userId) {
        const user = await this.usersService.findById(userId);
        return {
            id: user.id,
            email: user.email,
            username: user.username,
            roles: user.userRoles?.map(ur => ur.role.roleName) || [],
            status: user.status,
            lastLoginTime: user.lastLoginTime,
        };
    }

    async generateTokens(user) {
        const payload = {
            sub: user.id,
            email: user.email,
            roles: user.userRoles?.map(ur => ur.role.roleName) || [],
        };

        const secret = process.env.JWT_SECRET;
        const refreshSecret = process.env.JWT_REFRESH_SECRET;
        const expiresIn = process.env.JWT_EXPIRES_IN || '15m';
        const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

        if (!secret || !refreshSecret) {
            throw new Error('JWT secrets are not defined');
        }

        const [accessToken, refreshToken] = await Promise.all([
            jwt.sign(payload, secret, { expiresIn: expiresIn }),
            jwt.sign(payload, refreshSecret, { expiresIn: refreshExpiresIn }),
        ]);

        return {
            accessToken,
            refreshToken,
        };
    }
}
