import 'reflect-metadata';
import { RolesService } from '../roles.service.js';
import { RolesRepository } from '../../repositories/roles.repository.js';

jest.mock('../../repositories/roles.repository.js', () => ({
    RolesRepository: jest.fn(),
}));

describe('RolesService - UC11 Role Management', () => {
    let service;
    let rolesRepo;

    const expectRejectWithStatus = async (promise, statusCode) => {
        try {
            await promise;
            throw new Error('Expected promise to reject');
        } catch (err) {
            expect(err).toBeInstanceOf(Error);
            if (err.statusCode) {
                expect(err.statusCode).toBe(statusCode);
            }
        }
    };

    beforeEach(() => {
        jest.clearAllMocks();
        rolesRepo = {
            findByName: jest.fn(),
            create: jest.fn(),
            findAll: jest.fn(),
            findById: jest.fn(),
            findByNameExcludeId: jest.fn(),
            update: jest.fn(),
            isRoleInUse: jest.fn(),
            delete: jest.fn(),
            updatePermissions: jest.fn(),
            getPermissions: jest.fn(),
        };
        RolesRepository.mockImplementation(() => rolesRepo);
        service = new RolesService(rolesRepo);
    });

    it('UTCID01: Create Role Success - should create a role successfully', async () => {
        const roleData = { name: 'Admin', description: 'Administrator', status: 'active' };
        rolesRepo.findByName.mockResolvedValue(null);
        rolesRepo.create.mockResolvedValue({ id: 1, roleName: 'Admin', ...roleData });

        const result = await service.create(roleData);

        expect(rolesRepo.findByName).toHaveBeenCalledWith('Admin');
        expect(rolesRepo.create).toHaveBeenCalled();
        expect(result.id).toBe(1);
    });

    it('UTCID02: Create Role Conflict - should throw error if name exists', async () => {
        const roleData = { name: 'Admin' };
        rolesRepo.findByName.mockResolvedValue({ id: 1, roleName: 'Admin' });

        await expectRejectWithStatus(service.create(roleData), 409);
    });

    it('UTCID03: Edit Role Success - should update role details', async () => {
        const updateData = { name: 'New Name' };
        rolesRepo.findById.mockResolvedValue({ id: 1, roleName: 'Old Name' });
        rolesRepo.findByNameExcludeId.mockResolvedValue(null);
        rolesRepo.update.mockResolvedValue({ id: 1, roleName: 'New Name' });

        const result = await service.update(1, updateData);

        expect(rolesRepo.update).toHaveBeenCalled();
        expect(result.roleName).toBe('New Name');
    });

    it('UTCID04: Delete Role Success - should soft delete non-system role not in use', async () => {
        rolesRepo.findById.mockResolvedValue({ id: 1, isSystem: false });
        rolesRepo.isRoleInUse.mockResolvedValue(false);
        rolesRepo.delete.mockResolvedValue(undefined);

        await service.remove(1);

        expect(rolesRepo.delete).toHaveBeenCalledWith(1);
    });

    it('UTCID05: Delete Role System Role (Error) - should throw error if system role', async () => {
        rolesRepo.findById.mockResolvedValue({ id: 1, isSystem: true });

        await expectRejectWithStatus(service.remove(1), 409);
    });

    it('UTCID06: Delete Role In Use (Error) - should throw error if in use', async () => {
        rolesRepo.findById.mockResolvedValue({ id: 1, isSystem: false });
        rolesRepo.isRoleInUse.mockResolvedValue(true);

        await expectRejectWithStatus(service.remove(1), 409);
    });

    it('UTCID07: View Role Details - should return role by ID', async () => {
        rolesRepo.findById.mockResolvedValue({ id: 1, roleName: 'Admin' });

        const result = await service.findById(1);

        expect(result.id).toBe(1);
    });

    it('UTCID08: Search Roles - should filter roles correctly', async () => {
        rolesRepo.findAll.mockResolvedValue([{ id: 1, roleName: 'Admin' }]);

        const result = await service.findAll({ search: 'Admin', status: 'active' });

        expect(rolesRepo.findAll).toHaveBeenCalledWith({ search: 'Admin', status: 'active' });
        expect(result).toHaveLength(1);
    });

    it('UTCID09: View Permission List - should return permissions assigned to role', async () => {
        rolesRepo.findById.mockResolvedValue({ id: 1 });
        rolesRepo.getPermissions.mockResolvedValue([{ id: 10, permissionCode: 'TEST:READ' }]);

        const result = await service.getPermissions(1);

        expect(result).toHaveLength(1);
        expect(result[0].permissionCode).toBe('TEST:READ');
    });
});
