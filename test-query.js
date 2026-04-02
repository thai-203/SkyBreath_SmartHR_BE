import { AppDataSource } from './src/database/data-source.js';
import { AttendanceRecordEntity } from './src/models/entities/attendance-record.entity.js';
import { EmployeeEntity } from './src/models/entities/employee.entity.js';

async function test() {
    await AppDataSource.initialize();
    
    const year = 2026;
    const month = 2;
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    console.log("Looking between", startDate, endDate);

    const attendanceRepo = AppDataSource.getRepository(AttendanceRecordEntity);
    const rawRecords = await attendanceRepo.createQueryBuilder('att')
      .where('att.isDeleted = :isDeleted', { isDeleted: false })
      .andWhere('att.checkInTime >= :start', { start: startDate })
      .andWhere('att.checkInTime <= :end', { end: endDate })
      .getMany();

    console.log("Found raw records:", rawRecords.length);
    if(rawRecords.length > 0) {
        console.log("Sample 1 checkInTime:", rawRecords[0].checkInTime, typeof rawRecords[0].checkInTime);
        console.log("Sample 1 dateKey:", (() => {
            const d = new Date(rawRecords[0].checkInTime || rawRecords[0].checkOutTime);
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        })());
    }

    process.exit(0);
}

test().catch(console.error);
