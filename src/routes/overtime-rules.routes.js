import { Router } from 'express';
import { OvertimeRulesController } from '../controllers/overtime-rules.controller.js';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
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

/**
 * @swagger
 * /overtime-rules:
 *   get:
 *     summary: Lấy danh sách quy định OT
 *     tags: [OvertimeRules]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get(
    '/',
    authMiddleware,
    overtimeRulesController.findAll
);

/**
 * @swagger
 * /overtime-rules/{id}:
 *   get:
 *     summary: Lấy chi tiết quy định OT theo ID
 *     tags: [OvertimeRules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get(
    '/:id',
    authMiddleware,
    overtimeRulesController.findById
);

/**
 * @swagger
 * /overtime-rules:
 *   post:
 *     summary: Tạo quy định OT mới
 *     tags: [OvertimeRules]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               salaryMultiplier:
 *                 type: number
 *               maxHoursPerDay:
 *                 type: integer
 *               maxHoursPerMonth:
 *                 type: integer
 *               appliesTo:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       201:
 *         description: Tạo thành công
 */
router.post(
    '/',
    authMiddleware,
    validationMiddleware(CreateOvertimeRuleDto),
    overtimeRulesController.create
);

/**
 * @swagger
 * /overtime-rules/{id}:
 *   put:
 *     summary: Cập nhật quy định OT
 *     tags: [OvertimeRules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               salaryMultiplier:
 *                 type: number
 *               maxHoursPerDay:
 *                 type: integer
 *               maxHoursPerMonth:
 *                 type: integer
 *               appliesTo:
 *                 type: string
 *               status:
 *                 type: string
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.put(
    '/:id',
    authMiddleware,
    validationMiddleware(UpdateOvertimeRuleDto),
    overtimeRulesController.update
);

/**
 * @swagger
 * /overtime-rules/{id}:
 *   delete:
 *     summary: Xóa quy định OT (soft delete)
 *     tags: [OvertimeRules]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Xóa thành công
 */
router.delete(
    '/:id',
    authMiddleware,
    overtimeRulesController.remove
);

export const overtimeRulesRoutes = router;
