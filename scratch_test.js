import { DataSource } from 'typeorm';
import { databaseConfig } from './src/config/database.config.js';
import { DepartmentEntity } from './src/models/entities/department.entity.js';

const checkCircular = async () => {
  console.log('--- CHECKING DATABASE FOR CIRCULAR DEPENDENCIES ---');
  
  const { AppDataSource } = await import('./src/database/data-source.js');
  AppDataSource.setOptions({ synchronize: false });
  await AppDataSource.initialize();

  try {
    const deptRepo = AppDataSource.getRepository(DepartmentEntity);
    const depts = await deptRepo.find({ where: { isDeleted: false } });

    console.log(`Loaded ${depts.length} departments.`);

    const deptMap = new Map(depts.map(d => [d.id, d]));
    let hasLoopGlobal = false;

    for (const d of depts) {
      let visited = new Set();
      let curr = d;
      let loop = [];
      while (curr) {
        if (visited.has(curr.id)) {
          loop.push(curr.id);
          hasLoopGlobal = true;
          console.log(`DETECTED LOOP: ${d.departmentName} (ID: ${d.id}) -> path: ${Array.from(visited).join(' -> ')} -> ${curr.id}`);
          break;
        }
        visited.add(curr.id);
        if (curr.parentDepartmentId) {
          curr = deptMap.get(curr.parentDepartmentId);
        } else {
          break;
        }
      }
    }

    if (!hasLoopGlobal) {
      console.log('No circular dependencies detected in the database.');
    }

  } catch (error) {
    console.error('Error checking circular dependencies:', error);
  } finally {
    await AppDataSource.destroy();
  }
};

checkCircular();
