import { Router } from 'express';
import { PositionsController } from '../controllers/positions.controller.js';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { permissionsMiddleware } from '../common/middleware/permissions.middleware.js';
import { validationMiddleware } from '../common/middleware/validation.middleware.js';
import { CreatePositionDto, UpdatePositionDto } from '../models/dto/positions/index.js';

const router = Router();
const positionsController = new PositionsController();

/**
 * @swagger
 * tags:
 *   - name: Positions
 *     description: Quản lý danh mục vị trí công việc
 */

/**
 * @swagger
 * /positions/list:
 *   get:
 *     summary: Lấy danh sách positions dạng rút gọn (dropdown)
 *     tags: [Positions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trả về danh sách đơn giản
 */
router.get(
  '/list',
  authMiddleware,
  permissionsMiddleware('CONTRACT_READ'),
  (req, res, next) => positionsController.findList(req, res, next)
);

/**
 * @swagger
 * /positions/export/excel:
 *   get:
 *     summary: Xuất danh sách positions ra file Excel
 *     tags: [Positions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: File Excel (.xlsx)
 */
router.get(
  '/export/excel',
  authMiddleware,
  permissionsMiddleware('CONTRACT_READ'),
  (req, res, next) => positionsController.exportExcel(req, res, next)
);

/**
 * @swagger
 * /positions:
 *   get:
 *     summary: Lấy danh sách positions (có phân trang)
 *     tags: [Positions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           example: 10
 *     responses:
 *       200:
 *         description: Thành công
 *
 *   post:
 *     summary: Tạo mới một vị trí (position)
 *     tags: [Positions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePositionDto'
 *     responses:
 *       201:
 *         description: Tạo thành công
 */
router.get(
  '/',
  authMiddleware,
  permissionsMiddleware('CONTRACT_READ'),
  positionsController.findAll
);

router.post(
  '/',
  authMiddleware,
  permissionsMiddleware('CONTRACT_READ'),
  validationMiddleware(CreatePositionDto),
  (req, res, next) => positionsController.create(req, res, next)
);

/**
 * @swagger
 * /positions/{id}:
 *   get:
 *     summary: Lấy chi tiết position theo ID
 *     tags: [Positions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thành công
 *
 *   put:
 *     summary: Cập nhật thông tin position
 *     tags: [Positions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePositionDto'
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *
 *   delete:
 *     summary: Xóa position
 *     tags: [Positions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Xóa thành công
 */
router.get(
  '/:id',
  authMiddleware,
  permissionsMiddleware('CONTRACT_READ'),
  (req, res, next) => positionsController.findById(req, res, next)
);

router.put(
  '/:id',
  authMiddleware,
  permissionsMiddleware('CONTRACT_READ'),
  validationMiddleware(UpdatePositionDto),
  (req, res, next) => positionsController.update(req, res, next)
);

router.delete(
  '/:id',
  authMiddleware,
  permissionsMiddleware('CONTRACT_READ'),
  (req, res, next) => positionsController.remove(req, res, next)
);

export const positionsRoutes = router;
