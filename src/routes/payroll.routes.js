import { Router } from 'express';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { permissionsMiddleware } from '../common/middleware/permissions.middleware.js';
import { excelUpload, payrollDocUpload } from '../common/middleware/upload.middleware.js';
import { PayrollController } from '../controllers/payroll.controller.js';
import { PayrollDetailRepository } from '../repositories/payroll-detail.repository.js';
import { PayrollRepository } from '../repositories/payroll.repository.js';
import { PayrollService } from '../services/payroll.service.js';

const router = Router();

// Dependency Injection
const payrollRepository = new PayrollRepository();
const payrollDetailRepository = new PayrollDetailRepository();
const payrollService = new PayrollService(
  payrollRepository,
  payrollDetailRepository,
);
const payrollController = new PayrollController(payrollService);

/**
 * @swagger
 * tags:
 *   name: Payroll
 *   description: Payroll management endpoints (UC27-UC30)
 */

// UC27 - Create payroll batch
router.post(
  '/',
  authMiddleware,
  permissionsMiddleware('PAYROLL_CREATE'),
  payrollController.create,
);

// UC28 - List & View
router.get(
  '/',
  authMiddleware,
  permissionsMiddleware('PAYROLL_READ'),
  payrollController.findAll,
);

// UC28 - Export summary (before /:id routes)
router.get(
  '/export/:id',
  authMiddleware,
  permissionsMiddleware('PAYROLL_EXPORT'),
  payrollController.exportSummary,
);

// UC30 - Export payslips (before /:id routes)
router.get(
  '/payslips/:id',
  authMiddleware,
  permissionsMiddleware('PAYROLL_EXPORT'),
  payrollController.exportPayslips,
);

// UC28 - Get payroll detail
router.get(
  '/:id',
  authMiddleware,
  permissionsMiddleware('PAYROLL_READ'),
  payrollController.findById,
);

// UC28 - Update payroll general info
router.patch(
  '/:id',
  authMiddleware,
  permissionsMiddleware('PAYROLL_UPDATE'),
  payrollController.update,
);

// UC28 - Get details by department
router.get(
  '/:id/department/:departmentId',
  authMiddleware,
  permissionsMiddleware('PAYROLL_READ'),
  payrollController.getDetailsByDepartment,
);

// UC27 - Auto-calculate
router.post(
  '/:id/calculate',
  authMiddleware,
  permissionsMiddleware('PAYROLL_UPDATE'),
  payrollController.autoCalculate,
);

// UC27 - Edit employee detail row
router.put(
  '/details/:detailId',
  authMiddleware,
  permissionsMiddleware('PAYROLL_UPDATE'),
  payrollController.updateDetail,
);

// UC27 - Bulk upsert payroll details
router.post(
  '/:id/upsert-details',
  authMiddleware,
  permissionsMiddleware('PAYROLL_UPDATE'),
  payrollController.upsertDetails,
);

// UC29 - Submit / Approve / Reject
router.post(
  '/:id/submit',
  authMiddleware,
  permissionsMiddleware('PAYROLL_UPDATE'),
  payrollController.submitForApproval,
);
router.post(
  '/:id/approve',
  authMiddleware,
  permissionsMiddleware('PAYROLL_APPROVE'),
  payrollController.approve,
);
router.post(
  '/:id/reject',
  authMiddleware,
  permissionsMiddleware('PAYROLL_APPROVE'),
  payrollController.reject,
);

// UC30 - Lock & Payslips
router.post(
  '/:id/lock',
  authMiddleware,
  permissionsMiddleware('PAYROLL_LOCK'),
  payrollController.lock,
);
router.post(
  '/:id/unlock',
  authMiddleware,
  permissionsMiddleware('PAYROLL_LOCK'),
  payrollController.unlock,
);

router.post(
  '/:id/send-payslips',
  authMiddleware,
  // permissionsMiddleware('PAYROLL_SEND_PAYSLIPS'),
  payrollController.sendPayslips,
);

router.post(
  '/:id/send-payslips-selected',
  authMiddleware,
  // permissionsMiddleware('PAYROLL_SEND_PAYSLIPS'),
  payrollController.sendPayslipsSelected,
);

// UC28 - Import Details Excel
router.post(
  '/:id/import-details',
  authMiddleware,
  permissionsMiddleware('PAYROLL_UPDATE'),
  excelUpload.single('file'),
  payrollController.importDetails,
);

// ── FILE ĐÍNH KÈM ──

// GET  /:id/attachments
router.get(
  '/:id/attachments',
  authMiddleware,
  payrollController.listAttachments,
);

// POST /:id/attachments  (field name: "files", tối đa 5 file)
router.post(
  '/:id/attachments',
  authMiddleware,
  permissionsMiddleware('PAYROLL_UPDATE'),
  payrollDocUpload.array('files', 5),
  payrollController.uploadAttachments,
);

// DELETE /:id/attachments/:attachmentId
router.delete(
  '/:id/attachments/:attachmentId',
  authMiddleware,
  permissionsMiddleware('PAYROLL_UPDATE'),
  payrollController.deleteAttachment,
);

// GET /:id/attachments/:attachmentId/download
router.get(
  '/:id/attachments/:attachmentId/download',
  authMiddleware,
  payrollController.downloadAttachment,
);

export const payrollRoutes = router;
