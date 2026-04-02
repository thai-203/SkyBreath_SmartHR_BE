import { AppDataSource } from '../database/data-source.js';
import { ProcessedAttendanceRecordEntity } from '../models/entities/processed-attendance-record.entity.js';

export const ProcessedAttendanceRecordRepository = AppDataSource.getRepository(ProcessedAttendanceRecordEntity).extend({
    // Add custom repository methods here if needed, e.g. bulk upsert
    async saveMany(records) {
        return this.save(records);
    },

    async deleteForPeriod(month, year, departmentId = null) {
        const query = this.createQueryBuilder('par')
            .delete()
            .where('MONTH(attendance_date) = :month', { month })
            .andWhere('YEAR(attendance_date) = :year', { year });
            
        if (departmentId) {
            query.andWhere('employee_id IN (SELECT id FROM employees e WHERE e.department_id = :departmentId)', { departmentId });
        }
        
        return query.execute();
    }
});
