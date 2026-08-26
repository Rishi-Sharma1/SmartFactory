import express from 'express';
import * as notificationController from './notification.controller.js';
import authenticateToken from '../../middleware/auth.middleware.js';
import { resolveFactoryContext, requireRole } from '../../middleware/rbac.middleware.js';
import validate from '../../middleware/validate.js';
import { updateConfigSchema } from './notification.schema.js';

const router = express.Router();

router.use(authenticateToken, resolveFactoryContext);

router.get('/', notificationController.getNotifications);
router.put('/read-all', notificationController.markAllAsRead);
router.put('/:id/read', notificationController.markAsRead);
router.get('/config', requireRole('OWNER', 'MANAGER'), notificationController.getConfig);
router.put('/config', requireRole('OWNER', 'MANAGER'), validate(updateConfigSchema), notificationController.updateConfig);

export default router;
