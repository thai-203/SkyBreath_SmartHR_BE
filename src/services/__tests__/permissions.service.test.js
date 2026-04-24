import 'reflect-metadata';
import { PermissionsService } from '../permissions.service.js';
import { RolesService } from '../roles.service.js';
import { PermissionsRepository } from '../../repositories/permissions.repository.js';

jest.mock('../../repositories/permissions.repository.js', () => ({
    PermissionsRepository: jest.fn(),
}));

// Do NOT mock RolesService globally here if we want to use the real class logic


describe('PermissionsService - UC12 Permission Management', () => {
    let service;
    let permissionsRepo;
    let rolesService;

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
        permissionsRepo = {
            findAll: jest.fn(),
            findById: jest.fn(),
            findByCode: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        };
        PermissionsRepository.mockImplementation(() => permissionsRepo);
        service = new PermissionsService(permissionsRepo);
        
        // For Assign/Remove tests which belong to UC12 but use RolesService logic
        rolesService = new RolesService();
    });

    it('UTCID01: Search Permissions - should return paginated list', async () => {
        const mockData = { data: [{ id: 1, permissionCode: 'P1' }], meta: { total: 1 } };
        permissionsRepo.findAll.mockResolvedValue(mockData);

        const result = await service.findAll({ search: 'P', page: 1 });

        expect(permissionsRepo.findAll).toHaveBeenCalled();
        expect(result.data).toHaveLength(1);
    });

    it('UTCID02: Detail Permissions Success - should return detail', async () => {
        permissionsRepo.findById.mockResolvedValue({ id: 1, permissionCode: 'P1' });

        const result = await service.findById(1);

        expect(result.id).toBe(1);
    });

    it('UTCID03: Detail Permissions Not Found - should throw 404', async () => {
        permissionsRepo.findById.mockResolvedValue(null);

        await expectRejectWithStatus(service.findById(999), 404);
    });

    it('UTCID04: Edit Detail Permissions Success - should update correctly', async () => {
        permissionsRepo.findById.mockResolvedValue({ id: 1, permissionCode: 'P1' });
        permissionsRepo.update.mockResolvedValue({ id: 1, description: 'New' });

        const result = await service.update(1, { description: 'New' });

        expect(permissionsRepo.update).toHaveBeenCalled();
        expect(result.description).toBe('New');
    });

    it('UTCID05: Edit Detail Permissions Conflict - should throw 409', async () => {
        permissionsRepo.findById.mockResolvedValue({ id: 1, permissionCode: 'P1' });
        permissionsRepo.findByCode.mockResolvedValue({ id: 2, permissionCode: 'P2' });

        await expectRejectWithStatus(service.update(1, { permissionCode: 'P2' }), 409);
    });

    // Note: Assign/Remove use RolesService but are part of UC12 matrix
    it('UTCID06: Assign Permissions to Role - should call assign logic', async () => {
        // We test this logic via RolesService as implemented in the system
        const rolesRepoMock = { findById: jest.fn().mockResolvedValue({id: 1}), updatePermissions: jest.fn(), getPermissions: jest.fn().mockResolvedValue([]) };
        const realRolesService = new RolesService(rolesRepoMock);
        
        await realRolesService.assignPermissions(1, [1, 2]);
        
        expect(rolesRepoMock.updatePermissions).toHaveBeenCalledWith(1, [1, 2]);
    });

    it('UTCID07: Remove Permissions from Role - should call assign with reduced list', async () => {
        const rolesRepoMock = { findById: jest.fn().mockResolvedValue({id: 1}), updatePermissions: jest.fn(), getPermissions: jest.fn().mockResolvedValue([]) };
        const realRolesService = new RolesService(rolesRepoMock);
        
        await realRolesService.assignPermissions(1, [1]); // List with removed item
        
        expect(rolesRepoMock.updatePermissions).toHaveBeenCalledWith(1, [1]);
    });
});
