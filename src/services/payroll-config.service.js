import { AppDataSource } from '../database/data-source.js';
import { PayrollConfigEntity } from '../models/entities/payroll-config.entity.js';

export class PayrollConfigService {
    constructor() {
        this.repository = AppDataSource.getRepository(PayrollConfigEntity);
    }

    async getConfig() {
        const config = await this.repository.findOne({
            where: { configKey: 'GENERAL', isDeleted: false },
            relations: ['approver1', 'approver2']
        });
        
        if (!config) {
            // Create default if not exists
            const newConfig = this.repository.create({
                configKey: 'GENERAL',
                isActive: true
            });
            return await this.repository.save(newConfig);
        }
        
        return config;
    }

    async updateConfig(data) {
        let config = await this.repository.findOne({
            where: { configKey: 'GENERAL', isDeleted: false }
        });

        if (!config) {
            config = this.repository.create({ configKey: 'GENERAL' });
        }

        // Ensure we handle both camelCase and snake_case from frontend, and convert to numeric IDs
        if (data.approver1Id !== undefined) config.approver1Id = data.approver1Id ? Number(data.approver1Id) : null;
        if (data.approver1_id !== undefined) config.approver1Id = data.approver1_id ? Number(data.approver1_id) : null;
        
        if (data.approver2Id !== undefined) config.approver2Id = data.approver2Id ? Number(data.approver2Id) : null;
        if (data.approver2_id !== undefined) config.approver2Id = data.approver2_id ? Number(data.approver2_id) : null;
        
        if (data.isActive !== undefined) config.isActive = Boolean(data.isActive);
        if (data.is_active !== undefined) config.isActive = Boolean(data.is_active);

        // Insurance Rates
        if (data.socialInsuranceRate !== undefined) config.socialInsuranceRate = parseFloat(data.socialInsuranceRate);
        if (data.healthInsuranceRate !== undefined) config.healthInsuranceRate = parseFloat(data.healthInsuranceRate);
        if (data.unemploymentInsuranceRate !== undefined) config.unemploymentInsuranceRate = parseFloat(data.unemploymentInsuranceRate);
        if (data.unionFeeRate !== undefined) config.unionFeeRate = parseFloat(data.unionFeeRate);

        return await this.repository.save(config);
    }
}
