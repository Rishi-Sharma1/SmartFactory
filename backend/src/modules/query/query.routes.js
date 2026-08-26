import express from 'express';
import * as queryController from './query.controller.js';
import authenticateToken from '../../middleware/auth.middleware.js';
import { resolveFactoryContext, requireRole } from '../../middleware/rbac.middleware.js';

const router = express.Router();

router.use(authenticateToken, resolveFactoryContext);

router.post('/ask', requireRole('OWNER', 'MANAGER'), queryController.askQuestion);

export default router;
