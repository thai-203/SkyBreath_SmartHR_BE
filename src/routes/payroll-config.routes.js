import express from 'express';
import { PayrollConfigController } from '../controllers/payroll-config.controller.js';

const router = express.Router();
const controller = new PayrollConfigController();

router.get('/', controller.getConfig);
router.put('/', controller.updateConfig);

export default router;
