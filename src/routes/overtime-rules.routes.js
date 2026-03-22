import { Router } from 'express';
import { OvertimeRulesController } from '../controllers/overtime-rules.controller.js';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { permissionsMiddleware } from '../common/middleware/permissions.middleware.js';
import { validationMiddleware } from '../common/middleware/validation.middleware.js';
import { CreateOvertimeRuleDto, UpdateOvertimeRuleDto } from '../models/dto/overtime-rules/index.js';

const router = Router();
const overtimeRulesController = new OvertimeRulesController();

/**
 * @swagger
 * tags:
 *   - name: OvertimeRules
 *     description: Quản lý quy định làm thêm giờ
 */

// GET /overtime-rules
router.get('/', authMiddleware, permissionsMiddleware('OVERTIME_RULE_READ'), overtimeRulesController.findAll);

// GET /overtime-rules/:id
router.get('/:id', authMiddleware, permissionsMiddleware('OVERTIME_RULE_READ'), overtimeRulesController.findById);

// POST /overtime-rules
router.post(
    '/',
    authMiddleware,
    permissionsMiddleware('OVERTIME_RULE_CREATE'),
    validationMiddleware(CreateOvertimeRuleDto),
    overtimeRulesController.create
);

// PUT /overtime-rules/:id
router.put(
    '/:id',
    authMiddleware,
    permissionsMiddleware('OVERTIME_RULE_UPDATE'),
    validationMiddleware(UpdateOvertimeRuleDto),
    overtimeRulesController.update
);

// PATCH /overtime-rules/:id/activate — kích hoạt policy DRAFT → ACTIVE
router.patch(
    '/:id/activate',
    authMiddleware,
    permissionsMiddleware('OVERTIME_RULE_UPDATE'),
    overtimeRulesController.activate
);

// DELETE /overtime-rules/:id
router.delete('/:id', authMiddleware, permissionsMiddleware('OVERTIME_RULE_DELETE'), overtimeRulesController.remove);

export const overtimeRulesRoutes = router;
