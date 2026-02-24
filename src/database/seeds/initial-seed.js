import { DataSource } from 'typeorm';
import { hashPassword } from '../../common/utils/index.js';
import { databaseConfig } from '../../config/database.config.js';
import { DepartmentEntity } from '../../models/entities/department.entity.js';
import { EmployeeEntity } from '../../models/entities/employee.entity.js';
import { JobGradeEntity } from '../../models/entities/job-grade.entity.js';
import { PermissionEntity } from '../../models/entities/permission.entity.js';
import { PositionEntity } from '../../models/entities/position.entity.js';
import { RolePermissionEntity } from '../../models/entities/role-permission.entity.js';
import { RoleEntity } from '../../models/entities/role.entity.js';
import { UserRoleEntity } from '../../models/entities/user-role.entity.js';
import { UserEntity } from '../../models/entities/user.entity.js';
import { WorkingShiftEntity } from '../../models/entities/working-shift.entity.js';
import { ShiftAssignmentEntity } from '../../models/entities/shift-assignment.entity.js';
import { HolidayListEntity } from '../../models/entities/holiday-list.entity.js';
import { AttendanceRecordEntity } from '../../models/entities/attendance-record.entity.js';

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
            { permissionCode: 'EMPLOYEE_READ', description: 'View employees' },
            { permissionCode: 'EMPLOYEE_CREATE', description: 'Create employees' },
            { permissionCode: 'EMPLOYEE_UPDATE', description: 'Update employees' },
            { permissionCode: 'EMPLOYEE_DELETE', description: 'Delete employees' },
            { permissionCode: 'EMPLOYEE_EXPORT', description: 'Export employees' },
            { permissionCode: 'TIMESHEET_READ', description: 'View timesheets' },
            { permissionCode: 'TIMESHEET_CREATE', description: 'Generate timesheets' },
            { permissionCode: 'TIMESHEET_UPDATE', description: 'Edit timesheets' },
            { permissionCode: 'TIMESHEET_LOCK', description: 'Lock/Unlock timesheets' },
            { permissionCode: 'TIMESHEET_EXPORT', description: 'Export timesheets' },
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

        // Manager gets DEPT_READ, DEPT_UPDATE, Employee.View
        const managerPerms = ['DEPT_READ', 'DEPT_UPDATE', 'EMPLOYEE_READ', 'TIMESHEET_READ'];
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

        // HR gets DEPT_READ, DEPT_CREATE, DEPT_UPDATE, DEPT_EXPORT, Employee.*
        const hrPerms = [
            'DEPT_READ', 'DEPT_CREATE', 'DEPT_UPDATE', 'DEPT_EXPORT',
            'EMPLOYEE_READ', 'EMPLOYEE_CREATE', 'EMPLOYEE_UPDATE', 'EMPLOYEE_DELETE', 'EMPLOYEE_EXPORT',
            'TIMESHEET_READ', 'TIMESHEET_CREATE', 'TIMESHEET_UPDATE', 'TIMESHEET_LOCK', 'TIMESHEET_EXPORT'
        ];
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

        console.log('Assigned permissions to HR');

        // 4. Create Departments
        const departmentRepo = dataSource.getRepository(DepartmentEntity);
        const departmentsData = [
            { departmentName: 'Software Development' },
            { departmentName: 'Human Resources' },
            { departmentName: 'Finance' },
            { departmentName: 'Marketing' },
        ];

        const departments = {};
        for (const d of departmentsData) {
            let dept = await departmentRepo.findOne({ where: { departmentName: d.departmentName } });
            if (!dept) {
                dept = departmentRepo.create(d);
                await departmentRepo.save(dept);
                console.log(`Created department: ${d.departmentName}`);
            }
            departments[d.departmentName] = dept;
        }

        // 5. Create Positions
        const positionRepo = dataSource.getRepository(PositionEntity);
        const positionsData = [
            { positionName: 'Frontend Developer' },
            { positionName: 'Backend Developer' },
            { positionName: 'Mobile Developer' },
            { positionName: 'HR Specialist' },
            { positionName: 'HR Manager' },
            { positionName: 'Accountant' },
            { positionName: 'Finance Manager' },
            { positionName: 'Marketing Specialist' },
        ];

        for (const p of positionsData) {
            let pos = await positionRepo.findOne({ where: { positionName: p.positionName } });
            if (!pos) {
                pos = positionRepo.create(p);
                await positionRepo.save(pos);
                console.log(`Created position: ${p.positionName}`);
            }
        }

        // 6. Create Job Grades
        const jobGradeRepo = dataSource.getRepository(JobGradeEntity);
        const jobGradesData = [
            { gradeName: 'Junior', departmentName: 'Software Development', minSalary: 800, maxSalary: 1500 },
            { gradeName: 'Senior', departmentName: 'Software Development', minSalary: 1600, maxSalary: 3000 },
            { gradeName: 'Lead', departmentName: 'Software Development', minSalary: 3100, maxSalary: 6000 },
            { gradeName: 'Junior', departmentName: 'Human Resources', minSalary: 600, maxSalary: 1000 },
            { gradeName: 'Senior', departmentName: 'Human Resources', minSalary: 1100, maxSalary: 2000 },
        ];

        for (const j of jobGradesData) {
            let grade = await jobGradeRepo.findOne({
                where: {
                    gradeName: j.gradeName,
                    departmentId: departments[j.departmentName].id
                }
            });
            if (!grade) {
                grade = jobGradeRepo.create({
                    gradeName: j.gradeName,
                    departmentId: departments[j.departmentName].id,
                    minSalary: j.minSalary,
                    maxSalary: j.maxSalary
                });
                await jobGradeRepo.save(grade);
                console.log(`Created job grade: ${j.gradeName} for ${j.departmentName}`);
            }
        }

        // 7. Create Users and Employees
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
                    departmentId: u.role === 'HR' ? departments['Human Resources'].id : (u.role === 'MANAGER' ? departments['Software Development'].id : departments['Software Development'].id),
                    employmentStatus: 'ACTIVE',
                });
                await employeeRepo.save(employee);
                console.log(`Created employee record for: ${u.fullName}`);
            }
        }

        // ──────────────────────────────────────
        // 6. Seed Working Shifts
        // ──────────────────────────────────────
        const shiftRepo = dataSource.getRepository(WorkingShiftEntity);
        const shiftsData = [
            { shiftName: 'Ca hành chính', startTime: '08:00:00', endTime: '17:00:00', breakStartTime: '12:00:00', breakEndTime: '13:00:00' },
            { shiftName: 'Ca sáng', startTime: '06:00:00', endTime: '14:00:00', breakStartTime: '10:00:00', breakEndTime: '10:30:00' },
        ];
        const shifts = {};
        for (const s of shiftsData) {
            let shift = await shiftRepo.findOne({ where: { shiftName: s.shiftName } });
            if (!shift) {
                shift = shiftRepo.create(s);
                await shiftRepo.save(shift);
                console.log(`Created shift: ${s.shiftName}`);
            }
            shifts[s.shiftName] = shift;
        }

        // ──────────────────────────────────────
        // 7. Assign Shifts to Employees
        // ──────────────────────────────────────
        const shiftAssignmentRepo = dataSource.getRepository(ShiftAssignmentEntity);
        const allEmployees = await employeeRepo.find({ where: { isDeleted: false } });
        for (const emp of allEmployees) {
            const existing = await shiftAssignmentRepo.findOne({ where: { employeeId: emp.id, isDeleted: false } });
            if (!existing) {
                await shiftAssignmentRepo.save(shiftAssignmentRepo.create({
                    employeeId: emp.id,
                    shiftId: shifts['Ca hành chính'].id,
                    effectiveFrom: '2026-01-01',
                }));
                console.log(`Assigned shift to employee: ${emp.fullName}`);
            }
        }

        // ──────────────────────────────────────
        // 8. Seed Holidays
        // ──────────────────────────────────────
        const holidayRepo = dataSource.getRepository(HolidayListEntity);
        const holidaysData = [
            { holidayName: 'Tết Nguyên đán (bù)', holidayDate: '2026-02-02', description: 'Nghỉ bù Tết Nguyên đán' },
        ];
        for (const h of holidaysData) {
            const existing = await holidayRepo.findOne({ where: { holidayDate: h.holidayDate } });
            if (!existing) {
                await holidayRepo.save(holidayRepo.create(h));
                console.log(`Created holiday: ${h.holidayName}`);
            }
        }

        // ──────────────────────────────────────
        // 9. Seed Attendance Records (Feb 2026)
        // ──────────────────────────────────────
        const attendanceRepo = dataSource.getRepository(AttendanceRecordEntity);
        const existingAttCount = await attendanceRepo.count();
        if (existingAttCount === 0) {
            console.log('Seeding attendance records for Feb 2026...');

            // Helper: build attendance for one employee
            const buildAttendance = (employeeId, entries) => {
                return entries.map(e => attendanceRepo.create({
                    employeeId,
                    checkInTime: e.checkIn,
                    checkOutTime: e.checkOut,
                    attendanceStatus: e.status,
                    attendanceType: e.type,
                }));
            };

            // Feb 2026 weekdays (skip: 1(Sun),7(Sat),8(Sun),14(Sat),15(Sun),21(Sat),22(Sun),28(Sat))
            // Also skip Feb 2 (holiday)
            // Weekdays: 3,4,5,6, 9,10,11,12,13, 16,17,18,19,20, 23,24,25,26,27

            for (const emp of allEmployees) {
                // Generate varied attendance per employee
                const records = [];
                const weekdays = [3, 4, 5, 6, 9, 10, 11, 12, 13, 16, 17, 18, 19, 20, 23, 24, 25, 26, 27];

                // Some employees skip certain days (absent)
                const absentDays = [];
                if (emp.id % 3 === 0) absentDays.push(6);          // some miss Feb 6
                if (emp.id % 4 === 0) absentDays.push(19, 20);     // some miss Feb 19-20
                if (emp.id % 5 === 0) absentDays.push(10, 11);     // some miss Feb 10-11

                for (const day of weekdays) {
                    if (absentDays.includes(day)) continue;

                    // Vary check-in time
                    let checkInHour = 8;
                    let checkInMin = 0;
                    let status = 'ON_TIME';
                    let type = 'NORMAL';

                    // Some late arrivals
                    if ((emp.id + day) % 7 === 0) {
                        checkInMin = 15 + (day % 20);
                        status = 'LATE';
                    } else if ((emp.id + day) % 11 === 0) {
                        checkInMin = 5;
                    } else if (day % 5 === 0) {
                        checkInHour = 7;
                        checkInMin = 50 + (day % 10);
                    }

                    // Vary check-out time
                    let checkOutHour = 17;
                    let checkOutMin = 0;

                    // Some OT
                    if ((emp.id + day) % 9 === 0) {
                        checkOutHour = 18 + (day % 2);
                        checkOutMin = 30;
                        type = 'OVERTIME';
                    } else if (day % 8 === 0) {
                        checkOutMin = 15;
                    }

                    // Some early leave
                    if ((emp.id + day) % 13 === 0) {
                        checkOutHour = 16;
                        checkOutMin = 30;
                    }

                    const pad = (n) => String(n).padStart(2, '0');
                    const checkIn = `2026-02-${pad(day)} ${pad(checkInHour)}:${pad(checkInMin)}:00`;
                    const checkOut = `2026-02-${pad(day)} ${pad(checkOutHour)}:${pad(checkOutMin)}:00`;

                    records.push(attendanceRepo.create({
                        employeeId: emp.id,
                        checkInTime: checkIn,
                        checkOutTime: checkOut,
                        attendanceStatus: status,
                        attendanceType: type,
                    }));
                }

                await attendanceRepo.save(records);
                console.log(`Created ${records.length} attendance records for: ${emp.fullName}`);
            }
        } else {
            console.log(`Attendance records already exist (${existingAttCount}), skipping.`);
        }

        console.log('Seeding completed successfully.');
    } catch (error) {
        console.error('Error seeding data:', error);
    } finally {
        await dataSource.destroy();
    }
};

seed();
