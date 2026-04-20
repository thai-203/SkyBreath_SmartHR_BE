import { PayrollConfigService } from '../services/payroll-config.service.js';
import { ResponseUtil } from '../common/utils/response.util.js';

export class PayrollConfigController {
    constructor() {
        this.service = new PayrollConfigService();
    }

    getConfig = async (req, res, next) => {
        try {
            const config = await this.service.getConfig();
            ResponseUtil.sendResponse(res, "Retrieved payroll configuration successfully", config);
        } catch (error) {
            next(error);
        }
    };

    updateConfig = async (req, res, next) => {
        try {
            const updated = await this.service.updateConfig(req.body);
            ResponseUtil.sendResponse(res, "Updated payroll configuration successfully", updated);
        } catch (error) {
            next(error);
        }
    };
}
