import express from 'express';
import * as shiftController from './shift.controller.js';
import authenticateToken from '../../middleware/auth.middleware.js';
import { resolveFactoryContext, requireRole } from '../../middleware/rbac.middleware.js';
import validate from '../../middleware/validate.js';
import { openShiftSchema } from './shift.schema.js';

const router = express.Router();

router.use(authenticateToken, resolveFactoryContext);

router.get('/', shiftController.getShifts);
router.post('/', requireRole('OWNER', 'MANAGER', 'SUPERVISOR'), validate(openShiftSchema), shiftController.openShift);
router.put('/:id/close', requireRole('OWNER', 'MANAGER', 'SUPERVISOR'), shiftController.closeShift);

export default router;
