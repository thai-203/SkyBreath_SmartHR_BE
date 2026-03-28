import { Router } from 'express';
import { PenaltiesController } from '../controllers/penalties.controller.js';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { permissionsMiddleware } from '../common/middleware/permissions.middleware.js';
import { validationMiddleware } from '../common/middleware/validation.middleware.js';
import { CreatePenaltyDto, UpdatePenaltyDto } from '../models/dto/penalties/index.js';

const router = Router();
const penaltiesController = new PenaltiesController();

/**
 * @swagger
 * tags:
 *   - name: Penalties
 *     description: Quản lý quy định vi phạm (Penalty Rules)
 */

/**
 * @swagger
 * /penalties:
 *   get:
 *     summary: Lấy danh sách quy định vi phạm (có lọc & phân trang)
 *     tags: [Penalties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm theo ghi chú
 *       - in: query
 *         name: violationType
 *         schema:
 *           type: string
 *           enum: [LATE, EARLY]
 *         description: Lọc theo trường hợp vi phạm
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
 *         description: Lọc theo trạng thái
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get(
    '/',
    authMiddleware,
    permissionsMiddleware('PENALTY_READ'),
    penaltiesController.findAll
);

/**
 * @swagger
 * /penalties/{id}:
 *   get:
 *     summary: Lấy chi tiết quy định vi phạm theo ID
 *     tags: [Penalties]
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
    permissionsMiddleware('PENALTY_READ'),
    penaltiesController.findById
);

/**
 * @swagger
 * /penalties:
 *   post:
 *     summary: Tạo quy định vi phạm mới
 *     tags: [Penalties]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - violationType
 *               - effectiveFrom
 *               - fromMinute
 *               - toMinute
 *               - convertedHours
 *             properties:
 *               violationType:
 *                 type: string
 *                 enum: [LATE, EARLY]
 *               effectiveFrom:
 *                 type: string
 *                 format: date
 *               effectiveTo:
 *                 type: string
 *                 format: date
 *               fromMinute:
 *                 type: integer
 *                 minimum: 0
 *               toMinute:
 *                 type: integer
 *                 minimum: 1
 *               convertedHours:
 *                 type: number
 *                 minimum: 0
 *               note:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE]
 *                 default: ACTIVE
 *     responses:
 *       201:
 *         description: Tạo thành công
 */
router.post(
    '/',
    authMiddleware,
    permissionsMiddleware('PENALTY_CREATE'),
    validationMiddleware(CreatePenaltyDto),
    penaltiesController.create
);

/**
 * @swagger
 * /penalties/{id}:
 *   put:
 *     summary: Cập nhật quy định vi phạm
 *     tags: [Penalties]
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
 *               violationType:
 *                 type: string
 *                 enum: [LATE, EARLY]
 *               effectiveFrom:
 *                 type: string
 *                 format: date
 *               effectiveTo:
 *                 type: string
 *                 format: date
 *               fromMinute:
 *                 type: integer
 *               toMinute:
 *                 type: integer
 *               convertedHours:
 *                 type: number
 *               note:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [ACTIVE, INACTIVE]
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 */
router.put(
    '/:id',
    authMiddleware,
    permissionsMiddleware('PENALTY_UPDATE'),
    validationMiddleware(UpdatePenaltyDto),
    penaltiesController.update
);

/**
 * @swagger
 * /penalties/{id}:
 *   delete:
 *     summary: Xóa quy định vi phạm (soft delete)
 *     tags: [Penalties]
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
    permissionsMiddleware('PENALTY_DELETE'),
    penaltiesController.remove
);

export const penaltiesRoutes = router;
