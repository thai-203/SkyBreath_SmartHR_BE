import { Router } from 'express';
import { PenaltiesController } from '../controllers/penalties.controller.js';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { validationMiddleware } from '../common/middleware/validation.middleware.js';
import { CreatePenaltyDto, UpdatePenaltyDto } from '../models/dto/penalties/index.js';

const router = Router();
const penaltiesController = new PenaltiesController();

/**
 * @swagger
 * tags:
 *   - name: Penalties
 *     description: Quản lý quy định hình phạt
 */

/**
 * @swagger
 * /penalties:
 *   get:
 *     summary: Lấy danh sách hình phạt (có lọc & phân trang)
 *     tags: [Penalties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Tìm theo tên hoặc số tiền trừ
 *       - in: query
 *         name: penaltyType
 *         schema:
 *           type: string
 *           enum: [WARNING, SALARY_DEDUCTION, SUSPENSION, TERMINATION]
 *         description: Lọc theo loại hình phạt
 *       - in: query
 *         name: severityLevel
 *         schema:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *         description: Lọc theo mức độ
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ACTIVE, INACTIVE]
 *         description: Lọc theo trạng thái
 *       - in: query
 *         name: minDeductionAmount
 *         schema:
 *           type: number
 *         description: Số tiền trừ tối thiểu
 *       - in: query
 *         name: maxDeductionAmount
 *         schema:
 *           type: number
 *         description: Số tiền trừ tối đa
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Trang hiện tại
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số bản ghi mỗi trang
 *     responses:
 *       200:
 *         description: Thành công
 */
router.get(
    '/',
    authMiddleware,
    penaltiesController.findAll
);

/**
 * @swagger
 * /penalties/{id}:
 *   get:
 *     summary: Lấy chi tiết hình phạt theo ID
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
    penaltiesController.findById
);

/**
 * @swagger
 * /penalties:
 *   post:
 *     summary: Tạo hình phạt mới
 *     tags: [Penalties]
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
 *               penaltyType:
 *                 type: string
 *                 enum: [WARNING, SALARY_DEDUCTION, SUSPENSION, TERMINATION]
 *               severityLevel:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *               deductionAmount:
 *                 type: number
 *               deductionPercentage:
 *                 type: number
 *               description:
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
    validationMiddleware(CreatePenaltyDto),
    penaltiesController.create
);

/**
 * @swagger
 * /penalties/{id}:
 *   put:
 *     summary: Cập nhật hình phạt
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
 *               name:
 *                 type: string
 *               penaltyType:
 *                 type: string
 *               severityLevel:
 *                 type: string
 *               deductionAmount:
 *                 type: number
 *               deductionPercentage:
 *                 type: number
 *               description:
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
    validationMiddleware(UpdatePenaltyDto),
    penaltiesController.update
);

/**
 * @swagger
 * /penalties/{id}:
 *   delete:
 *     summary: Xóa hình phạt (soft delete)
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
    penaltiesController.remove
);

export const penaltiesRoutes = router;
