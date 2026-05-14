/**
 * Script để seed thêm PERFORMANCE_REVIEW permissions vào database
 * Chạy: node src/database/seeds/add-performance-review-permissions.js
 */

import { AppDataSource } from '../data-source.js';
import { PermissionEntity } from '../../models/entities/permission.entity.js';
import { RolePermissionEntity } from '../../models/entities/role-permission.entity.js';
import { AppDataSource as DataSource } from '../../database/data-source.js';

const newPermissions = [
    {
        permissionCode: 'PERFORMANCE_REVIEW_READ',
        description: 'View performance reviews',
        module: 'PerformanceReview',
    },
    {
        permissionCode: 'PERFORMANCE_REVIEW_CREATE',
        description: 'Create performance review',
        module: 'PerformanceReview',
    },
    {
        permissionCode: 'PERFORMANCE_REVIEW_UPDATE',
        description: 'Update performance review',
        module: 'PerformanceReview',
    },
    {
        permissionCode: 'PERFORMANCE_REVIEW_DELETE',
        description: 'Delete performance review',
        module: 'PerformanceReview',
    },
];

const seedPermissions = async () => {
    try {
        console.log('Starting permission seed...');

        // Initialize DataSource if not already
        if (!DataSource.isInitialized) {
            await DataSource.initialize();
            console.log('DataSource initialized');
        }

        const permissionRepo = DataSource.getRepository(PermissionEntity);
        const rolePermissionRepo = DataSource.getRepository(RolePermissionEntity);

        // Find role IDs
        const adminRole = await DataSource.getRepository('RoleEntity').findOne({ where: { roleName: 'ADMIN' } });
        const managerRole = await DataSource.getRepository('RoleEntity').findOne({ where: { roleName: 'MANAGER' } });
        const hrRole = await DataSource.getRepository('RoleEntity').findOne({ where: { roleName: 'HR' } });

        console.log('Roles found:', { admin: adminRole?.id, manager: managerRole?.id, hr: hrRole?.id });

        for (const permData of newPermissions) {
            // Check if permission exists
            let permission = await permissionRepo.findOne({
                where: { permissionCode: permData.permissionCode }
            });

            if (!permission) {
                // Create new permission
                permission = permissionRepo.create(permData);
                await permissionRepo.save(permission);
                console.log(`Created permission: ${permData.permissionCode}`);
            } else {
                console.log(`Permission already exists: ${permData.permissionCode}`);
            }

            // Assign to ADMIN
            if (adminRole) {
                const adminExists = await rolePermissionRepo.findOne({
                    where: { roleId: adminRole.id, permissionId: permission.id }
                });
                if (!adminExists) {
                    await rolePermissionRepo.save(
                        rolePermissionRepo.create({ roleId: adminRole.id, permissionId: permission.id })
                    );
                    console.log(`Assigned ${permData.permissionCode} to ADMIN`);
                }
            }

            // Assign to MANAGER
            if (managerRole) {
                const managerExists = await rolePermissionRepo.findOne({
                    where: { roleId: managerRole.id, permissionId: permission.id }
                });
                if (!managerExists) {
                    await rolePermissionRepo.save(
                        rolePermissionRepo.create({ roleId: managerRole.id, permissionId: permission.id })
                    );
                    console.log(`Assigned ${permData.permissionCode} to MANAGER`);
                }
            }

            // Assign to HR
            if (hrRole) {
                const hrExists = await rolePermissionRepo.findOne({
                    where: { roleId: hrRole.id, permissionId: permission.id }
                });
                if (!hrExists) {
                    await rolePermissionRepo.save(
                        rolePermissionRepo.create({ roleId: hrRole.id, permissionId: permission.id })
                    );
                    console.log(`Assigned ${permData.permissionCode} to HR`);
                }
            }
        }

        console.log('Permission seed completed successfully!');

        // Close connection
        if (DataSource.isInitialized) {
            await DataSource.destroy();
        }

        process.exit(0);
    } catch (error) {
        console.error('Error seeding permissions:', error);
        process.exit(1);
    }
};

seedPermissions();
