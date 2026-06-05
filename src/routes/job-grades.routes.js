import { Router } from 'express';
import { JobGradesController } from '../controllers/job-grades.controller.js';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { permissionsMiddleware } from '../common/middleware/permissions.middleware.js';
import { validationMiddleware } from '../common/middleware/validation.middleware.js';
import { CreateJobGradeDto, UpdateJobGradeDto } from '../models/dto/job-grades/index.js';

const router = Router();
const jobGradesController = new JobGradesController();

/**
 * @swagger
 * tags:
 *   - name: JobGrades
 *     description: Quản lý thang bảng lương / cấp bậc công việc
 */

/**
 * @swagger
 * /job-grades/list:
 *   get:
 *     summary: Lấy danh sách job grades dạng rút gọn
 *     tags: [JobGrades]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Trả về danh sách đơn giản
 */
router.get(
  '/list',
  authMiddleware,
  (req, res, next) => jobGradesController.findList(req, res, next)
);

/**
 * @swagger
 * /job-grades/export/excel:
 *   get:
 *     summary: Xuất danh sách job grades ra file Excel
 *     tags: [JobGrades]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: File Excel (.xlsx)
 */
router.get(
  '/export/excel',
  authMiddleware,
  (req, res, next) => jobGradesController.exportExcel(req, res, next)
);

/**
 * @swagger
 * /job-grades:
 *   get:
 *     summary: Lấy danh sách job grades (có phân trang)
 *     tags: [JobGrades]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Thành công
 *
 *   post:
 *     summary: Tạo mới một job grade
 *     tags: [JobGrades]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateJobGradeDto'
 *     responses:
 *       201:
 *         description: Tạo thành công
 */
router.get(
  '/',
  authMiddleware,
  (req, res, next) => jobGradesController.findAll(req, res, next)
);

router.post(
  '/',
  authMiddleware,
  validationMiddleware(CreateJobGradeDto),
  (req, res, next) => jobGradesController.create(req, res, next)
);

/**
 * @swagger
 * /job-grades/{id}:
 *   get:
 *     summary: Lấy chi tiết job grade theo ID
 *     tags: [JobGrades]
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
 *     summary: Cập nhật thông tin job grade
 *     tags: [JobGrades]
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
 *             $ref: '#/components/schemas/UpdateJobGradeDto'
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *
 *   delete:
 *     summary: Xóa job grade
 *     tags: [JobGrades]
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
  (req, res, next) => jobGradesController.findById(req, res, next)
);

router.put(
  '/:id',
  authMiddleware,
  validationMiddleware(UpdateJobGradeDto),
  (req, res, next) => jobGradesController.update(req, res, next)
);

router.delete(
  '/:id',
  authMiddleware,
  (req, res, next) => jobGradesController.remove(req, res, next)
);

export const jobGradesRoutes = router;
