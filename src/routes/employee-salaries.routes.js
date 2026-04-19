import { Router } from 'express';
import { EmployeeSalariesController } from '../controllers/employee-salaries.controller.js';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { permissionsMiddleware } from '../common/middleware/permissions.middleware.js';
import { validationMiddleware } from '../common/middleware/validation.middleware.js';
import {
  CreateEmployeeSalaryDto,
  UpdateEmployeeSalaryDto,
} from '../models/dto/employee-salaries/index.js';

const router = Router();
const employeeSalariesController = new EmployeeSalariesController();

/**
 * @swagger
 * tags:
 *   - name: EmployeeSalaries
 *     description: Quản lý lương nhân viên
 */

/**
 * @swagger
 * /employee-salaries/list:
 *   get:
 *     summary: Lấy danh sách lương nhân viên dạng rút gọn (dropdown)
 *     tags: [EmployeeSalaries]
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
  (req, res, next) => employeeSalariesController.findList(req, res, next)
);

/**
 * @swagger
 * /employee-salaries/export/excel:
 *   get:
 *     summary: Xuất danh sách lương nhân viên ra file Excel
 *     tags: [EmployeeSalaries]
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
  (req, res, next) => employeeSalariesController.exportExcel(req, res, next)
);

/**
 * @swagger
 * /employee-salaries:
 *   get:
 *     summary: Lấy danh sách lương nhân viên (có phân trang)
 *     tags: [EmployeeSalaries]
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
 *     summary: Tạo mới lương nhân viên
 *     tags: [EmployeeSalaries]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateEmployeeSalaryDto'
 *     responses:
 *       201:
 *         description: Tạo thành công
 */
router.get(
  '/',
  authMiddleware,
  permissionsMiddleware('CONTRACT_READ'),
  employeeSalariesController.findAll
);

/**
 * @swagger
 * /employee-salaries/employee/{employeeId}:
 * get:
 * summary: Lấy thông tin lương theo ID nhân viên
 * tags: [EmployeeSalaries]
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: employeeId
 * required: true
 * schema:
 * type: string
 */
router.get(
  '/employee/:employeeId',
  authMiddleware,
  permissionsMiddleware('CONTRACT_READ'),
  (req, res, next) => employeeSalariesController.findByEmployeeId(req, res, next)
);

router.post(
  '/',
  authMiddleware,
  permissionsMiddleware('CONTRACT_CREATE'),
  validationMiddleware(CreateEmployeeSalaryDto),
  (req, res, next) => employeeSalariesController.create(req, res, next)
);

/**
 * @swagger
 * /employee-salaries/{id}:
 *   get:
 *     summary: Lấy chi tiết lương nhân viên theo ID
 *     tags: [EmployeeSalaries]
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
 *     summary: Cập nhật thông tin lương nhân viên
 *     tags: [EmployeeSalaries]
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
 *             $ref: '#/components/schemas/UpdateEmployeeSalaryDto'
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *
 *   delete:
 *     summary: Xóa lương nhân viên
 *     tags: [EmployeeSalaries]
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
  (req, res, next) => employeeSalariesController.findById(req, res, next)
);

router.put(
  '/:id',
  authMiddleware,
  permissionsMiddleware('CONTRACT_UPDATE'),
  validationMiddleware(UpdateEmployeeSalaryDto),
  (req, res, next) => employeeSalariesController.update(req, res, next)
);

router.delete(
  '/:id',
  authMiddleware,
  permissionsMiddleware('CONTRACT_DELETE'),
  (req, res, next) => employeeSalariesController.remove(req, res, next)
);

export const employeeSalariesRoutes = router;
