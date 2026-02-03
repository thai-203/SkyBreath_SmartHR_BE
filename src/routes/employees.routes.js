import { Router } from 'express';
import { EmployeesController } from '../controllers/employees.controller.js';
import { EmployeesService } from '../services/employees.service.js';
import { EmployeesRepository } from '../repositories/employees.repository.js';
import { authMiddleware } from '../common/middleware/auth.middleware.js';

const router = Router();

// Dependency Injection
const employeesRepository = new EmployeesRepository();
const employeesService = new EmployeesService(employeesRepository);
const employeesController = new EmployeesController(employeesService);

/**
 * @swagger
 * tags:
 *   name: Employees
 *   description: Employee management endpoints
 */

/**
 * @swagger
 * /employees/list:
 *   get:
 *     summary: Get paginated list of employees
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by full name
 *     responses:
 *       200:
 *         description: Employees retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/list', authMiddleware, employeesController.list);

/**
 * @swagger
 * /employees/{id}:
 *   patch:
 *     summary: Update employee information
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Employee ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               personalEmail:
 *                 type: string
 *               phoneNumber:
 *                 type: string
 *               address:
 *                 type: string
 *               departmentId:
 *                 type: integer
 *               positionId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Employee updated successfully
 *       404:
 *         description: Employee not found
 *       401:
 *         description: Unauthorized
 */
router.patch('/:id', authMiddleware, employeesController.update);

/**
 * @swagger
 * /employees/{id}:
 *   delete:
 *     summary: Soft delete an employee record
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Employee ID
 *     responses:
 *       200:
 *         description: Employee deleted successfully
 *       404:
 *         description: Employee not found
 *       401:
 *         description: Unauthorized
 */
router.delete('/:id', authMiddleware, employeesController.delete);

export const employeesRoutes = router;
