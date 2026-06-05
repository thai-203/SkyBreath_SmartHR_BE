import { AppDataSource } from './src/database/data-source.js';
import { DepartmentEntity } from './src/models/entities/department.entity.js';
import { EmployeeEntity } from './src/models/entities/employee.entity.js';

const syncManagers = async () => {
  console.log('--- STARTING MANAGER SYNCHRONIZATION ---');
  await AppDataSource.initialize();

  try {
    const deptRepo = AppDataSource.getRepository(DepartmentEntity);
    const empRepo = AppDataSource.getRepository(EmployeeEntity);

    // 1. Fetch all departments
    const departments = await deptRepo.find({
      where: { isDeleted: false }
    });
    
    const deptManagerMap = new Map(
      departments.map(d => [d.id, { managerId: d.managerEmployeeId, name: d.departmentName }])
    );
    console.log(`Loaded ${departments.length} departments.`);

    // 2. Fetch all active employees
    const employees = await empRepo.find({
      where: { isDeleted: false }
    });
    console.log(`Loaded ${employees.length} employees.`);

    let updateCount = 0;

    // 3. Sync each employee
    for (const emp of employees) {
      if (!emp.departmentId) continue;

      const deptInfo = deptManagerMap.get(emp.departmentId);
      if (!deptInfo || !deptInfo.managerId) continue;

      const targetManagerId = deptInfo.managerId;

      // Do not assign self as manager
      if (emp.id === targetManagerId) {
        console.log(`Skipping self-assignment for manager ${emp.fullName} in ${deptInfo.name}`);
        continue;
      }

      if (emp.directManagerId !== targetManagerId) {
        console.log(`Updating ${emp.fullName} direct manager from ID ${emp.directManagerId} to ID ${targetManagerId} (${deptInfo.name})`);
        emp.directManagerId = targetManagerId;
        await empRepo.save(emp);
        updateCount++;
      }
    }

    console.log(`Synchronization finished successfully. Updated ${updateCount} employee records.`);

  } catch (error) {
    console.error('Error during manager synchronization:', error);
  } finally {
    await AppDataSource.destroy();
  }
};

syncManagers();
