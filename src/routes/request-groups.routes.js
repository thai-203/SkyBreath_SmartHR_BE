import { Router } from 'express';
import { RequestGroupsController } from '../controllers/request-groups.controller.js';
import { authMiddleware } from '../common/middleware/auth.middleware.js';
import { permissionsMiddleware } from '../common/middleware/permissions.middleware.js';
import { validationMiddleware } from '../common/middleware/validation.middleware.js';
import { CreateRequestGroupDto, UpdateRequestGroupDto } from '../models/dto/request-groups/index.js';

const router = Router();
const requestGroupsController = new RequestGroupsController();

// GET /request-groups
router.get('/', authMiddleware, permissionsMiddleware('REQUEST_GROUP_READ'), requestGroupsController.findAll);

// GET /request-groups/:id
router.get('/:id', authMiddleware, permissionsMiddleware('REQUEST_GROUP_READ'), requestGroupsController.findById);
router.post(
    '/',
    authMiddleware,
    permissionsMiddleware('REQUEST_GROUP_CREATE'),
    validationMiddleware(CreateRequestGroupDto),
    requestGroupsController.create
);
router.put(
    '/:id',
    authMiddleware,
    permissionsMiddleware('REQUEST_GROUP_UPDATE'),
    validationMiddleware(UpdateRequestGroupDto),
    requestGroupsController.update
);
router.delete('/:id', authMiddleware, permissionsMiddleware('REQUEST_GROUP_DELETE'), requestGroupsController.remove);

export const requestGroupsRoutes = router;
