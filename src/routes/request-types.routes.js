import { Router } from 'express';
import { RequestTypesController } from '../controllers/request-types.controller.js';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { permissionsMiddleware } from '../common/middleware/permissions.middleware.js';
import { validationMiddleware } from '../common/middleware/validation.middleware.js';
import { CreateRequestTypeDto, UpdateRequestTypeDto } from '../models/dto/request-types/index.js';

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
router.delete('/:id', authMiddleware, permissionsMiddleware('REQUEST_TYPE_DELETE'), requestTypesController.remove);

export const requestTypesRoutes = router;
