import express from 'express';
import * as machineController from './machine.controller.js';
import authenticateToken from '../../middleware/auth.middleware.js';
import { resolveFactoryContext, requireRole } from '../../middleware/rbac.middleware.js';
import validate from '../../middleware/validate.js';
import {
  createMachineSchema,
  updateMachineStatusSchema,
  logFaultSchema,
} from './machine.schema.js';

const router = express.Router();

router.use(authenticateToken, resolveFactoryContext);

router.get('/', machineController.getMachines);
router.post('/', requireRole('OWNER', 'MANAGER'), validate(createMachineSchema), machineController.createMachine);
router.put('/:id/status', requireRole('OWNER', 'MANAGER', 'SUPERVISOR'), validate(updateMachineStatusSchema), machineController.updateStatus);
router.post('/:id/fault', requireRole('OPERATOR', 'SUPERVISOR', 'MANAGER', 'OWNER'), validate(logFaultSchema), machineController.logFault);
router.post('/:id/resolve', requireRole('OWNER', 'MANAGER'), machineController.resolveFault);
router.get('/:id/logs', machineController.getLogs);

export default router;
