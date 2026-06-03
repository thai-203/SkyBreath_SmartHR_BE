import { AppDataSource } from './database/data-source.js';
import { OvertimeRequestDetailEntity } from './models/entities/overtime-request-detail.entity.js';
import { TimeSheetEntity } from './models/entities/time-sheet.entity.js';

async function run() {
    await AppDataSource.initialize();
    try {
        const employeeId = 18;
        const month = 4;
        const year = 2026;

        console.log("=== RUNNING EXACT ORM QUERY FOR OT DETAILS ===");
        const otDetailRepo = AppDataSource.getRepository(OvertimeRequestDetailEntity);
        const otDetails = await otDetailRepo
            .createQueryBuilder('otd')
            .leftJoinAndSelect('otd.request', 'req')
            .leftJoinAndSelect('req.requestGroup', 'rg')
            .leftJoinAndSelect('otd.overtimeRule', 'rule')
            .leftJoinAndSelect('rule.overtimeType', 'type')
            .where('MONTH(otd.workDate) = :m AND YEAR(otd.workDate) = :y', {
                m: month,
                y: year,
            })
            .andWhere('req.status = :s', { s: 'APPROVED' })
            .andWhere('rg.code = :groupCode', { groupCode: 'OVERTIME' })
            .andWhere('req.employeeId = :employeeId', { employeeId })
            .getMany();

        console.log("Result otDetails length:", otDetails.length);
        console.log(otDetails);

        console.log("=== RUNNING EXACT ORM QUERY FOR TIMESHEET ===");
        const timesheetRepo = AppDataSource.getRepository(TimeSheetEntity);
        const timesheet = await timesheetRepo.findOne({
            where: { employeeId, month, year }
        });
        console.log(timesheet);

    } catch (e) {
        console.error(e);
    } finally {
        await AppDataSource.destroy();
    }
}

run();
