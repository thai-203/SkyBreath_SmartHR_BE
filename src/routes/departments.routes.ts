import { Router } from 'express';
import { DepartmentsController } from '../controllers/departments.controller';
import { authMiddleware } from '../common/middleware/auth.middleware';
import { permissionsMiddleware } from '../common/middleware/permissions.middleware';
import { validationMiddleware } from '../common/middleware/validation.middleware';
import { CreateDepartmentDto, UpdateDepartmentDto, DepartmentQueryDto } from '../models/dto/departments';

const router = Router();
const departmentsController = new DepartmentsController();

/**
 * @swagger
 * tags:
 *   name: Departments
 *   description: Department management
 */

/**
 * @swagger
 * /departments:
 *   post:
 *     summary: Create a new department
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateDepartmentDto'
 *     responses:
 *       201:
 *         description: Department created successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *   get:
 *     summary: Get all departments
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term
 *     responses:
 *       200:
 *         description: List of departments
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/', authMiddleware, permissionsMiddleware('DEPT_CREATE'), validationMiddleware(CreateDepartmentDto), departmentsController.create);
router.get('/list', authMiddleware, departmentsController.list);
router.get('/', authMiddleware, permissionsMiddleware('DEPT_READ'), departmentsController.findAll);

/**
 * @swagger
 * /departments/chart:
 *   get:
 *     summary: Get organization chart
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Organization chart
 */
router.get('/chart', authMiddleware, permissionsMiddleware('DEPT_READ'), departmentsController.getOrgChart);

/**
 * @swagger
 * /departments/export:
 *   get:
 *     summary: Export department list to CSV
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: CSV file
 */
router.get('/export', authMiddleware, permissionsMiddleware('DEPT_EXPORT'), departmentsController.exportCsv);

/**
 * @swagger
 * /departments/{id}:
 *   get:
 *     summary: Get department by ID
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Department ID
 *     responses:
 *       200:
 *         description: Department details
 *       404:
 *         description: Department not found
 *   put:
 *     summary: Update department
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Department ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateDepartmentDto'
 *     responses:
 *       200:
 *         description: Department updated successfully
 *       404:
 *         description: Department not found
 *   delete:
 *     summary: Delete department
 *     tags: [Departments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Department ID
 *     responses:
 *       200:
 *         description: Department deleted successfully
 *       404:
 *         description: Department not found
 */
router.get('/:id', authMiddleware, permissionsMiddleware('DEPT_READ'), departmentsController.findOne);
router.put('/:id', authMiddleware, permissionsMiddleware('DEPT_UPDATE'), validationMiddleware(UpdateDepartmentDto), departmentsController.update);
router.delete('/:id', authMiddleware, permissionsMiddleware('DEPT_DELETE'), departmentsController.remove);

export const departmentsRoutes = router;
