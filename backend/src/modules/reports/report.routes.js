import express from 'express';
import * as reportController from './report.controller.js';
import authenticateToken from '../../middleware/auth.middleware.js';
import { resolveFactoryContext, requireRole } from '../../middleware/rbac.middleware.js';

const router = express.Router();

router.use(authenticateToken, resolveFactoryContext);

router.get('/daily', requireRole('OWNER', 'MANAGER'), reportController.getDailyReport);
router.get('/weekly', requireRole('OWNER', 'MANAGER'), reportController.getWeeklyReport);
router.get('/shift/:id', requireRole('OWNER', 'MANAGER', 'SUPERVISOR'), reportController.getShiftReport);
router.post('/export', requireRole('OWNER', 'MANAGER'), reportController.exportReport);

export default router;
