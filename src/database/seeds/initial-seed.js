import { DataSource } from 'typeorm';
import { hashPassword } from '../../common/utils/index.js';
import { databaseConfig } from '../../config/database.config.js';
import { AttendanceRecordEntity } from '../../models/entities/attendance-record.entity.js';
import { DepartmentEntity } from '../../models/entities/department.entity.js';
import { EmployeeEntity } from '../../models/entities/employee.entity.js';
import { HolidayListEntity } from '../../models/entities/holiday-list.entity.js';
import { JobGradeEntity } from '../../models/entities/job-grade.entity.js';
import { PayrollTypeEntity } from '../../models/entities/payroll-type.entity.js';
import { PermissionEntity } from '../../models/entities/permission.entity.js';
import { PositionEntity } from '../../models/entities/position.entity.js';
import { RolePermissionEntity } from '../../models/entities/role-permission.entity.js';
import { RoleEntity } from '../../models/entities/role.entity.js';
import { UserRoleEntity } from '../../models/entities/user-role.entity.js';
import { UserEntity } from '../../models/entities/user.entity.js';

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
      {
        permissionCode: 'TIMESHEET_CREATE',
        description: 'Generate timesheets',
      },
      { permissionCode: 'TIMESHEET_UPDATE', description: 'Edit timesheets' },
      {
        permissionCode: 'TIMESHEET_LOCK',
        description: 'Lock/Unlock timesheets',
      },
      { permissionCode: 'TIMESHEET_EXPORT', description: 'Export timesheets' },
      {
        permissionCode: 'HOLIDAY_READ',
        description: 'View holiday list',
        module: 'Holiday',
      },
      {
        permissionCode: 'HOLIDAY_CREATE',
        description: 'Create holiday',
        module: 'Holiday',
      },
      {
        permissionCode: 'HOLIDAY_UPDATE',
        description: 'Update holiday',
        module: 'Holiday',
      },
      {
        permissionCode: 'HOLIDAY_DELETE',
        description: 'Delete holiday',
        module: 'Holiday',
      },
      {
        permissionCode: 'HOLIDAY_EXPORT',
        description: 'Export holidays',
        module: 'Holiday',
      },

      // Contracts
      {
        permissionCode: 'CONTRACT_READ',
        description: 'View contracts',
        module: 'Contract',
      },
      {
        permissionCode: 'CONTRACT_CREATE',
        description: 'Create contract',
        module: 'Contract',
      },
      {
        permissionCode: 'CONTRACT_UPDATE',
        description: 'Update contract',
        module: 'Contract',
      },
      {
        permissionCode: 'CONTRACT_DELETE',
        description: 'Delete contract',
        module: 'Contract',
      },
      {
        permissionCode: 'CONTRACT_EXPORT',
        description: 'Export contracts',
        module: 'Contract',
      },

      // Positions
      {
        permissionCode: 'POSITION_READ',
        description: 'View positions',
        module: 'Position',
      },
      {
        permissionCode: 'POSITION_CREATE',
        description: 'Create position',
        module: 'Position',
      },
      {
        permissionCode: 'POSITION_UPDATE',
        description: 'Update position',
        module: 'Position',
      },
      {
        permissionCode: 'POSITION_DELETE',
        description: 'Delete position',
        module: 'Position',
      },
      {
        permissionCode: 'POSITION_EXPORT',
        description: 'Export positions',
        module: 'Position',
      },

      // Job Grades
      {
        permissionCode: 'JOB_GRADE_READ',
        description: 'View job grades',
        module: 'JobGrade',
      },
      {
        permissionCode: 'JOB_GRADE_CREATE',
        description: 'Create job grade',
        module: 'JobGrade',
      },
      {
        permissionCode: 'JOB_GRADE_UPDATE',
        description: 'Update job grade',
        module: 'JobGrade',
      },
      {
        permissionCode: 'JOB_GRADE_DELETE',
        description: 'Delete job grade',
        module: 'JobGrade',
      },
      {
        permissionCode: 'JOB_GRADE_EXPORT',
        description: 'Export job grades',
        module: 'JobGrade',
      },

      // Employee Salaries
      {
        permissionCode: 'EMPLOYEE_SALARY_READ',
        description: 'View employee salaries',
        module: 'Salary',
      },
      {
        permissionCode: 'EMPLOYEE_SALARY_CREATE',
        description: 'Create employee salary',
        module: 'Salary',
      },
      {
        permissionCode: 'EMPLOYEE_SALARY_UPDATE',
        description: 'Update employee salary',
        module: 'Salary',
      },
      {
        permissionCode: 'EMPLOYEE_SALARY_DELETE',
        description: 'Delete employee salary',
        module: 'Salary',
      },
      {
        permissionCode: 'EMPLOYEE_SALARY_EXPORT',
        description: 'Export employee salaries',
        module: 'Salary',
      },

      // Shift management
      {
        permissionCode: 'SHIFT_GROUP_READ',
        description: 'View shift groups',
        module: 'Shift',
      },
      {
        permissionCode: 'SHIFT_GROUP_CREATE',
        description: 'Create shift group',
        module: 'Shift',
      },
      {
        permissionCode: 'SHIFT_GROUP_UPDATE',
        description: 'Update shift group',
        module: 'Shift',
      },
      {
        permissionCode: 'SHIFT_GROUP_DELETE',
        description: 'Delete shift group',
        module: 'Shift',
      },
      {
        permissionCode: 'SHIFT_READ',
        description: 'View working shifts',
        module: 'Shift',
      },
      {
        permissionCode: 'SHIFT_CREATE',
        description: 'Create working shift',
        module: 'Shift',
      },
      {
        permissionCode: 'SHIFT_UPDATE',
        description: 'Update working shift',
        module: 'Shift',
      },
      {
        permissionCode: 'SHIFT_DELETE',
        description: 'Delete working shift',
        module: 'Shift',
      },
      {
        permissionCode: 'SHIFT_ASSIGN_READ',
        description: 'View shift assignments',
        module: 'Shift',
      },
      {
        permissionCode: 'SHIFT_ASSIGN_CREATE',
        description: 'Assign shifts',
        module: 'Shift',
      },
      {
        permissionCode: 'SHIFT_ASSIGN_UPDATE',
        description: 'Update shift assignment',
        module: 'Shift',
      },
      {
        permissionCode: 'SHIFT_ASSIGN_DELETE',
        description: 'Cancel shift assignment',
        module: 'Shift',
      },
      {
        permissionCode: 'SHIFT_SCHEDULE_READ',
        description: 'View shift schedules',
        module: 'Shift',
      },
      // Payroll
      {
        permissionCode: 'PAYROLL_READ',
        description: 'View payroll list and details',
        module: 'Payroll',
      },
      {
        permissionCode: 'PAYROLL_CREATE',
        description: 'Create new payroll period',
        module: 'Payroll',
      },
      {
        permissionCode: 'PAYROLL_UPDATE',
        description: 'Update payroll details and auto-calculate',
        module: 'Payroll',
      },
      {
        permissionCode: 'PAYROLL_APPROVE',
        description: 'Submit, Approve, or Reject payroll',
        module: 'Payroll',
      },
      {
        permissionCode: 'PAYROLL_LOCK',
        description: 'Lock payroll and send payslips',
        module: 'Payroll',
      },
      {
        permissionCode: 'PAYROLL_EXPORT',
        description: 'Export payroll summary or payslips',
        module: 'Payroll',
      },
      // Payroll Type
      {
        permissionCode: 'PAYROLL_TYPE_READ',
        description: 'View payroll type list',
        module: 'PayrollType',
      },
      {
        permissionCode: 'PAYROLL_TYPE_CREATE',
        description: 'Create new payroll type',
        module: 'PayrollType',
      },
      {
        permissionCode: 'PAYROLL_TYPE_UPDATE',
        description: 'Update payroll type',
        module: 'PayrollType',
      },
      {
        permissionCode: 'PAYROLL_TYPE_DELETE',
        description: 'Delete payroll type',
        module: 'PayrollType',
      },
    ];

    const permissionRepo = dataSource.getRepository(PermissionEntity);
    const permissions = [];

    for (const p of permissionsData) {
      let permission = await permissionRepo.findOne({
        where: { permissionCode: p.permissionCode },
      });
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
      const exists = await rolePermissionRepo.findOne({
        where: { roleId: roles['ADMIN'].id, permissionId: p.id },
      });
      if (!exists) {
        const rp = rolePermissionRepo.create({
          roleId: roles['ADMIN'].id,
          permissionId: p.id,
        });
        await rolePermissionRepo.save(rp);
      }
    }
    console.log('Assigned permissions to ADMIN');

    // MANAGER gets DEPT_READ, EMPLOYEE_READ, HOLIDAY_READ, POSITION_READ, JOB_GRADE_READ
    const managerPerms = [
      'DEPT_READ',
      'EMPLOYEE_READ',
      'HOLIDAY_READ',
      'POSITION_READ',
      'JOB_GRADE_READ',
      'TIMESHEET_READ',
      'SHIFT_GROUP_READ',
      'SHIFT_READ',
      'SHIFT_ASSIGN_READ',
      'SHIFT_SCHEDULE_READ',
    ];
    for (const code of managerPerms) {
      const p = permissions.find((perm) => perm.permissionCode === code);
      if (p) {
        const exists = await rolePermissionRepo.findOne({
          where: { roleId: roles['MANAGER'].id, permissionId: p.id },
        });
        if (!exists) {
          await rolePermissionRepo.save(
            rolePermissionRepo.create({
              roleId: roles['MANAGER'].id,
              permissionId: p.id,
            }),
          );
        }
      }
    }
    console.log('Assigned permissions to MANAGER');

    // HR gets DEPT_READ, DEPT_CREATE, DEPT_UPDATE, DEPT_EXPORT, Employee.*, Holiday.*, Contract.*, Position.*, JobGrade.*, Salary.*
    const hrPerms = [
      'DEPT_READ',
      'DEPT_CREATE',
      'DEPT_UPDATE',
      'DEPT_EXPORT',
      'EMPLOYEE_READ',
      'EMPLOYEE_CREATE',
      'EMPLOYEE_UPDATE',
      'EMPLOYEE_DELETE',
      'EMPLOYEE_EXPORT',
      'TIMESHEET_READ',
      'TIMESHEET_CREATE',
      'TIMESHEET_UPDATE',
      'TIMESHEET_LOCK',
      'TIMESHEET_EXPORT',
      'HOLIDAY_READ',
      'HOLIDAY_CREATE',
      'HOLIDAY_UPDATE',
      'HOLIDAY_DELETE',
      'HOLIDAY_EXPORT',
      'CONTRACT_READ',
      'CONTRACT_CREATE',
      'CONTRACT_UPDATE',
      'CONTRACT_DELETE',
      'CONTRACT_EXPORT',
      'POSITION_READ',
      'POSITION_CREATE',
      'POSITION_UPDATE',
      'POSITION_DELETE',
      'POSITION_EXPORT',
      'JOB_GRADE_READ',
      'JOB_GRADE_CREATE',
      'JOB_GRADE_UPDATE',
      'JOB_GRADE_DELETE',
      'JOB_GRADE_EXPORT',
      'EMPLOYEE_SALARY_READ',
      'EMPLOYEE_SALARY_CREATE',
      'EMPLOYEE_SALARY_UPDATE',
      'EMPLOYEE_SALARY_DELETE',
      'EMPLOYEE_SALARY_EXPORT',
      // shift-related for HR
      'SHIFT_GROUP_READ',
      'SHIFT_GROUP_CREATE',
      'SHIFT_GROUP_UPDATE',
      'SHIFT_GROUP_DELETE',
      'SHIFT_READ',
      'SHIFT_CREATE',
      'SHIFT_UPDATE',
      'SHIFT_DELETE',
      'SHIFT_ASSIGN_READ',
      'SHIFT_ASSIGN_CREATE',
      'SHIFT_ASSIGN_UPDATE',
      'SHIFT_ASSIGN_DELETE',
      'SHIFT_SCHEDULE_READ',
      // Payroll
      'PAYROLL_READ',
      'PAYROLL_CREATE',
      'PAYROLL_UPDATE',
      'PAYROLL_APPROVE',
      'PAYROLL_LOCK',
      'PAYROLL_EXPORT',
      // Payroll Type
      'PAYROLL_TYPE_READ',
      'PAYROLL_TYPE_CREATE',
      'PAYROLL_TYPE_UPDATE',
      'PAYROLL_TYPE_DELETE',
    ];
    for (const code of hrPerms) {
      const p = permissions.find((perm) => perm.permissionCode === code);
      if (p) {
        const exists = await rolePermissionRepo.findOne({
          where: { roleId: roles['HR'].id, permissionId: p.id },
        });
        if (!exists) {
          await rolePermissionRepo.save(
            rolePermissionRepo.create({
              roleId: roles['HR'].id,
              permissionId: p.id,
            }),
          );
        }
      }
    }
    console.log('Assigned permissions to HR');

    console.log('Assigned permissions to HR');

    // EMPLOYEE gets TIMESHEET_READ, DEPT_READ, HOLIDAY_READ
    const employeePerms = ['TIMESHEET_READ', 'DEPT_READ', 'HOLIDAY_READ'];
    for (const code of employeePerms) {
      const p = permissions.find((perm) => perm.permissionCode === code);
      if (p) {
        const exists = await rolePermissionRepo.findOne({
          where: { roleId: roles['EMPLOYEE'].id, permissionId: p.id },
        });
        if (!exists) {
          await rolePermissionRepo.save(
            rolePermissionRepo.create({
              roleId: roles['EMPLOYEE'].id,
              permissionId: p.id,
            }),
          );
        }
      }
    }
    console.log('Assigned permissions to EMPLOYEE');

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
      let dept = await departmentRepo.findOne({
        where: { departmentName: d.departmentName },
      });
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
      let pos = await positionRepo.findOne({
        where: { positionName: p.positionName },
      });
      if (!pos) {
        pos = positionRepo.create(p);
        await positionRepo.save(pos);
        console.log(`Created position: ${p.positionName}`);
      }
    }

    // 6. Create Job Grades
    const jobGradeRepo = dataSource.getRepository(JobGradeEntity);
    const jobGradesData = [
      {
        gradeName: 'Junior',
        departmentName: 'Software Development',
        minSalary: 800,
        maxSalary: 1500,
      },
      {
        gradeName: 'Senior',
        departmentName: 'Software Development',
        minSalary: 1600,
        maxSalary: 3000,
      },
      {
        gradeName: 'Lead',
        departmentName: 'Software Development',
        minSalary: 3100,
        maxSalary: 6000,
      },
      {
        gradeName: 'Junior',
        departmentName: 'Human Resources',
        minSalary: 600,
        maxSalary: 1000,
      },
      {
        gradeName: 'Senior',
        departmentName: 'Human Resources',
        minSalary: 1100,
        maxSalary: 2000,
      },
    ];

    for (const j of jobGradesData) {
      let grade = await jobGradeRepo.findOne({
        where: {
          gradeName: j.gradeName,
          departmentId: departments[j.departmentName].id,
        },
      });
      if (!grade) {
        grade = jobGradeRepo.create({
          gradeName: j.gradeName,
          departmentId: departments[j.departmentName].id,
          minSalary: j.minSalary,
          maxSalary: j.maxSalary,
        });
        await jobGradeRepo.save(grade);
        console.log(
          `Created job grade: ${j.gradeName} for ${j.departmentName}`,
        );
      }
    }

    // 7. Create Users and Employees
    const userRepo = dataSource.getRepository(UserEntity);
    const userRoleRepo = dataSource.getRepository(UserRoleEntity);
    const employeeRepo = dataSource.getRepository(EmployeeEntity);
    const password = await hashPassword('password123');

    const usersData = [
      {
        username: 'admin',
        email: 'admin@example.com',
        role: 'ADMIN',
        fullName: 'System Administrator',
        employeeCode: 'EMP001'
      },
      {
        username: 'manager',
        email: 'manager@example.com',
        role: 'MANAGER',
        fullName: 'John Manager',
        employeeCode: 'EMP002'
      },
      {
        username: 'employee',
        email: 'employee@example.com',
        role: 'EMPLOYEE',
        fullName: 'Jane Employee',
        employeeCode: 'EMP003'
      },
      {
        username: 'hr',
        email: 'hr@example.com',
        role: 'HR',
        fullName: 'Alice HR',
        employeeCode: 'EMP004'
      },
    ];

    for (const u of usersData) {
      let user = await userRepo.findOne({
        where: { username: u.username },
        withDeleted: true,
      });

      if (!user) {
        user = await userRepo.findOne({
          where: { email: u.email },
          withDeleted: true,
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
          employeeCode: u.employeeCode,
          companyEmail: u.email,
          departmentId:
            u.role === 'HR'
              ? departments['Human Resources'].id
              : u.role === 'MANAGER'
                ? departments['Software Development'].id
                : departments['Software Development'].id,
          employmentStatus: 'ACTIVE',
        });
        await employeeRepo.save(employee);
        console.log(`Created employee record for: ${u.fullName}`);
      } else {
        // Update existing employee with code if missing or changed
        employee.employeeCode = u.employeeCode;
        employee.fullName = u.fullName;
        employee.companyEmail = u.email;
        await employeeRepo.save(employee);
        console.log(`Updated employee record for: ${u.fullName}`);
      }
    }


    // 8. Seed Holidays
    // ──────────────────────────────────────
    const holidayRepo = dataSource.getRepository(HolidayListEntity);
    const holidaysData = [
      {
        holidayName: 'Tết Nguyên đán (bù)',
        startDate: '2026-02-02',
        endDate: '2026-02-02',
        holidayType: 'Nghỉ lễ, tết',
        isPaid: true,
        description: 'Nghỉ bù Tết Nguyên đán',
      },
    ];
    for (const h of holidaysData) {
      const existing = await holidayRepo.findOne({
        where: { startDate: h.startDate, holidayName: h.holidayName },
      });
      if (!existing) {
        await holidayRepo.save(holidayRepo.create(h));
        console.log(`Created holiday: ${h.holidayName}`);
      }
    }

    // 9. Seed Payroll Types
    const payrollTypeRepo = dataSource.getRepository(PayrollTypeEntity);
    const adminUser = await userRepo.findOne({ where: { username: 'admin' } });
    const payrollTypesData = [
      {
        payrollTypeCode: '1',
        name: 'Bảng lương sản xuất',
        keyword: 'LUONG_SAN_XUAT',
        description: 'Bảng lương dành cho công nhân sản xuất (theo sản lượng)',
        departmentId: departments['Software Development'].id, // Placeholder
        createdById: adminUser.id,
      },
      {
        payrollTypeCode: '101',
        name: 'Bảng lương cấp đông',
        keyword: 'LUONG_CAP_DONG_TAG',
        description: 'Bảng lương dành cho bộ phận cấp đông (theo công đoạn)',
        departmentId: departments['Software Development'].id, // Placeholder
        createdById: adminUser.id,
      },
      {
        payrollTypeCode: 'OFFICE_01',
        name: 'Bảng lương văn phòng',
        keyword: 'LUONG_VAN_PHONG',
        description: 'Bảng lương dành cho nhân viên văn phòng (theo tháng)',
        departmentId: departments['Software Development'].id, // Placeholder
        createdById: adminUser.id,
      },
    ];

    for (const pt of payrollTypesData) {
      const existing = await payrollTypeRepo.findOne({
        where: { payrollTypeCode: pt.payrollTypeCode },
      });
      if (!existing) {
        await payrollTypeRepo.save(payrollTypeRepo.create(pt));
        console.log(`Created payroll type: ${pt.name}`);
      }
    }

    // ──────────────────────────────────────
    // 10. Seed Attendance Records (Feb 2026)
    // ──────────────────────────────────────
    const attendanceRepo = dataSource.getRepository(AttendanceRecordEntity);
    const existingAttCount = await attendanceRepo.count();
    if (existingAttCount === 0) {
      console.log('Seeding high-quality attendance records for Feb 2026...');

      // Clear existing records for Feb 2026 to avoid duplicates
      await attendanceRepo.delete({
        checkInTime: Between('2026-02-01 00:00:00', '2026-02-28 23:59:59')
      });

      for (const emp of allEmployees) {
        const records = [];
        // February 2026: 28 days. Weekdays are 2-6, 9-13, 16-20, 23-27
        const weekdays = [2, 3, 4, 5, 6, 9, 10, 11, 12, 13, 16, 17, 18, 19, 20, 23, 24, 25, 26, 27];

        for (const day of weekdays) {
          // Feb 2 is holiday but some might work (OT) - let's skip it for normal behavior
          if (day === 2) continue;

          // Default: 08:00 - 17:00
          let cinH = 7, cinM = 50 + Math.floor(Math.random() * 15); // 07:50 - 08:05
          let coutH = 17, coutM = Math.floor(Math.random() * 15); // 17:00 - 17:15
          let status = 'ON_TIME';
          let type = 'NORMAL';

          // Randomize some behavior
          const rand = Math.random();
          if (rand < 0.1) { // 10% late
            cinM = 10 + Math.floor(Math.random() * 20); // 08:10 - 08:30
            status = 'LATE';
          } else if (rand < 0.2) { // 10% early leave
            coutH = 16;
            coutM = 30 + Math.floor(Math.random() * 20); // 16:30 - 16:50
            status = 'EARLY_LEAVE';
          } else if (rand < 0.3) { // 10% OT
            coutH = 18 + Math.floor(Math.random() * 2); // 18:00 - 20:00
            coutM = Math.floor(Math.random() * 60);
            type = 'OVERTIME';
          }

          const checkIn = new Date(2026, 1, day, cinH, cinM, 0);
          const checkOut = new Date(2026, 1, day, coutH, coutM, 0);

          records.push(
            attendanceRepo.create({
              employeeId: emp.id,
              checkInTime: checkIn,
              checkOutTime: checkOut,
              attendanceStatus: status,
              attendanceType: type,
            }),
          );
        }
        await attendanceRepo.save(records);
        console.log(`Created ${records.length} high-quality records for ${emp.fullName}`);
      }
    } else {
      console.log(
        `Attendance records already exist (${existingAttCount}), skipping.`,
      );
    }

    console.log('Seeding completed successfully.');
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await dataSource.destroy();
  }
};

seed();
