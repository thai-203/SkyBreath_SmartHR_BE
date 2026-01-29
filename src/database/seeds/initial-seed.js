import { DataSource } from 'typeorm';
import { databaseConfig } from '../../config/database.config.js';
import { RoleEntity } from '../../models/entities/role.entity.js';
import { PermissionEntity } from '../../models/entities/permission.entity.js';
import { UserEntity } from '../../models/entities/user.entity.js';
import { UserRoleEntity } from '../../models/entities/user-role.entity.js';
import { RolePermissionEntity } from '../../models/entities/role-permission.entity.js';
import { EmployeeEntity } from '../../models/entities/employee.entity.js';
import { hashPassword } from '../../common/utils/index.js';

const seed = async () => {
    const dataSource = new DataSource(databaseConfig);
    await dataSource.initialize();

    try {
        console.log('Seeding data...');

        // 1. Create Permissions
        const permissionsData = [
            { permissionCode: 'USER_READ', description: 'Read users' },
            { permissionCode: 'USER_WRITE', description: 'Create/Update users' },
            { permissionCode: 'USER_DELETE', description: 'Delete users' },
            { permissionCode: 'ROLE_READ', description: 'Read roles' },
            { permissionCode: 'ROLE_WRITE', description: 'Create/Update roles' },
            { permissionCode: 'DEPT_READ', description: 'Read departments' },
            { permissionCode: 'DEPT_CREATE', description: 'Create departments' },
            { permissionCode: 'DEPT_UPDATE', description: 'Update departments' },
            { permissionCode: 'DEPT_DELETE', description: 'Delete departments' },
            { permissionCode: 'DEPT_EXPORT', description: 'Export departments' },
        ];

        const permissionRepo = dataSource.getRepository(PermissionEntity);
        const permissions = [];

        for (const p of permissionsData) {
            let permission = await permissionRepo.findOne({ where: { permissionCode: p.permissionCode } });
            if (!permission) {
                permission = permissionRepo.create(p);
                await permissionRepo.save(permission);
                console.log(`Created permission: ${p.permissionCode}`);
            }
            permissions.push(permission);
        }

        // 2. Create Roles
        const rolesData = [
            { roleName: 'ADMIN', description: 'Administrator' },
            { roleName: 'MANAGER', description: 'Manager' },
            { roleName: 'EMPLOYEE', description: 'Regular Employee' },
            { roleName: 'HR', description: 'Human Resources' },
        ];

        const roleRepo = dataSource.getRepository(RoleEntity);
        const roles = {};

        for (const r of rolesData) {
            let role = await roleRepo.findOne({ where: { roleName: r.roleName } });
            if (!role) {
                role = roleRepo.create(r);
                await roleRepo.save(role);
                console.log(`Created role: ${r.roleName}`);
            }
            roles[r.roleName] = role;
        }

        // 3. Assign Permissions to Roles
        const rolePermissionRepo = dataSource.getRepository(RolePermissionEntity);

        // Admin gets all permissions
        for (const p of permissions) {
            const exists = await rolePermissionRepo.findOne({ where: { roleId: roles['ADMIN'].id, permissionId: p.id } });
            if (!exists) {
                const rp = rolePermissionRepo.create({
                    roleId: roles['ADMIN'].id,
                    permissionId: p.id,
                });
                await rolePermissionRepo.save(rp);
            }
        }
        console.log('Assigned permissions to ADMIN');

        // Manager gets DEPT_READ, DEPT_UPDATE
        const managerPerms = ['DEPT_READ', 'DEPT_UPDATE'];
        for (const code of managerPerms) {
            const p = permissions.find(perm => perm.permissionCode === code);
            if (p) {
                const exists = await rolePermissionRepo.findOne({ where: { roleId: roles['MANAGER'].id, permissionId: p.id } });
                if (!exists) {
                    await rolePermissionRepo.save(rolePermissionRepo.create({ roleId: roles['MANAGER'].id, permissionId: p.id }));
                }
            }
        }
        console.log('Assigned permissions to MANAGER');

        // HR gets DEPT_READ, DEPT_CREATE, DEPT_UPDATE, DEPT_EXPORT
        const hrPerms = ['DEPT_READ', 'DEPT_CREATE', 'DEPT_UPDATE', 'DEPT_EXPORT'];
        for (const code of hrPerms) {
            const p = permissions.find(perm => perm.permissionCode === code);
            if (p) {
                const exists = await rolePermissionRepo.findOne({ where: { roleId: roles['HR'].id, permissionId: p.id } });
                if (!exists) {
                    await rolePermissionRepo.save(rolePermissionRepo.create({ roleId: roles['HR'].id, permissionId: p.id }));
                }
            }
        }
        console.log('Assigned permissions to HR');

        // 4. Create Users and Employees
        const userRepo = dataSource.getRepository(UserEntity);
        const userRoleRepo = dataSource.getRepository(UserRoleEntity);
        const employeeRepo = dataSource.getRepository(EmployeeEntity);
        const password = await hashPassword('password123');

        const usersData = [
            { username: 'admin', email: 'admin@example.com', role: 'ADMIN', fullName: 'System Administrator' },
            { username: 'manager', email: 'manager@example.com', role: 'MANAGER', fullName: 'John Manager' },
            { username: 'employee', email: 'employee@example.com', role: 'EMPLOYEE', fullName: 'Jane Employee' },
            { username: 'hr', email: 'hr@example.com', role: 'HR', fullName: 'Alice HR' },
        ];

        for (const u of usersData) {
            let user = await userRepo.findOne({
                where: { username: u.username },
                withDeleted: true
            });

            if (!user) {
                user = await userRepo.findOne({
                    where: { email: u.email },
                    withDeleted: true
                });
            }

            if (!user) {
                user = userRepo.create({
                    username: u.username,
                    email: u.email,
                    password: password,
                    status: 'ACTIVE',
                });
                await userRepo.save(user);
                console.log(`Created user: ${u.username}`);

                const userRole = userRoleRepo.create({
                    userId: user.id,
                    roleId: roles[u.role].id,
                });
                await userRoleRepo.save(userRole);
                console.log(`Assigned role ${u.role} to ${u.username}`);
            } else if (user.isDeleted) {
                user.isDeleted = false;
                user.deletedAt = null;
                await userRepo.save(user);
                console.log(`Restored soft-deleted user: ${u.username}`);
            }

            let employee = await employeeRepo.findOne({ where: { userId: user.id } });
            if (!employee) {
                employee = employeeRepo.create({
                    userId: user.id,
                    fullName: u.fullName,
                    companyEmail: u.email,
                    employmentStatus: 'ACTIVE',
                });
                await employeeRepo.save(employee);
                console.log(`Created employee record for: ${u.fullName}`);
            }
        }

        console.log('Seeding completed successfully.');
    } catch (error) {
        console.error('Error seeding data:', error);
    } finally {
        await dataSource.destroy();
    }
};

seed();
