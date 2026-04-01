import { Router } from 'express';
import { RequestTypesController } from '../controllers/request-types.controller.js';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { permissionsMiddleware } from '../common/middleware/permissions.middleware.js';
import { validationMiddleware } from '../common/middleware/validation.middleware.js';
import { CreateRequestTypeDto, UpdateRequestTypeDto, UpdateRequestTypePolicyDto } from '../models/dto/request-types/index.js';

const router = Router();
const requestTypesController = new RequestTypesController();

// GET /request-types
router.get('/', authMiddleware, permissionsMiddleware('REQUEST_TYPE_READ'), requestTypesController.findAll);

// GET /request-types/:id
router.get('/:id', authMiddleware, permissionsMiddleware('REQUEST_TYPE_READ'), requestTypesController.findById);
router.post(
    '/',
    authMiddleware,
    permissionsMiddleware('REQUEST_TYPE_CREATE'),
    validationMiddleware(CreateRequestTypeDto),
    requestTypesController.create
);
router.put(
    '/:id',
    authMiddleware,
    permissionsMiddleware('REQUEST_TYPE_UPDATE'),
    validationMiddleware(UpdateRequestTypeDto),
    requestTypesController.update
);
// PATCH /request-types/:id/policy — Cập nhật riêng phần Policy
router.patch(
    '/:id/policy',
    authMiddleware,
    permissionsMiddleware('REQUEST_TYPE_UPDATE'),
    validationMiddleware(UpdateRequestTypePolicyDto),
    requestTypesController.updatePolicy
);
router.delete('/:id', authMiddleware, permissionsMiddleware('REQUEST_TYPE_DELETE'), requestTypesController.remove);

// POST /request-types/:id/restore
router.post(
    '/:id/restore',
    authMiddleware,
    permissionsMiddleware('REQUEST_TYPE_UPDATE'),
    requestTypesController.restore
);

export const requestTypesRoutes = router;

