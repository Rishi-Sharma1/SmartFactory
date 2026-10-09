import express from 'express';
import * as productionController from './production.controller.js';
import authenticateToken from '../../middleware/auth.middleware.js';
import { resolveFactoryContext, requireRole } from '../../middleware/rbac.middleware.js';
import validate from '../../middleware/validate.js';
import { updateProductionSchema, setProductionTargetSchema } from './production.schema.js';

const router = express.Router();

router.use(authenticateToken, resolveFactoryContext);

router.get('/lines', productionController.getLines);
router.post('/lines', requireRole('OWNER', 'MANAGER'), productionController.createLine);
router.get('/', productionController.getProductionLogs);
router.get('/summary', productionController.getSummary);
router.post('/update', requireRole('SUPERVISOR', 'OPERATOR'), validate(updateProductionSchema), productionController.updateProduction);
router.post('/target', requireRole('MANAGER', 'OWNER'), validate(setProductionTargetSchema), productionController.setTarget);

export default router;

