import express from 'express';
import * as factoryController from './factory.controller.js';
import authenticateToken from '../../middleware/auth.middleware.js';
import { resolveFactoryContext, requireRole } from '../../middleware/rbac.middleware.js';
import validate from '../../middleware/validate.js';
import {
  createFactorySchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
} from './factory.schema.js';

const router = express.Router();

router.use(authenticateToken);

// User's own factories list
router.get('/', factoryController.getUserFactories);
router.post('/', validate(createFactorySchema), factoryController.createFactory);

// Specific factory operations (Owner guarded)
router.put('/:id', resolveFactoryContext, requireRole('OWNER'), factoryController.updateFactory);
router.post('/:id/invite', resolveFactoryContext, requireRole('OWNER'), validate(inviteMemberSchema), factoryController.inviteMember);
router.get('/:id/members', resolveFactoryContext, requireRole('OWNER', 'MANAGER'), factoryController.getFactoryMembers);
router.put('/:id/members/:userId', resolveFactoryContext, requireRole('OWNER'), validate(updateMemberRoleSchema), factoryController.updateMemberRole);
router.delete('/:id/members/:userId', resolveFactoryContext, requireRole('OWNER'), factoryController.revokeMemberAccess);

export default router;
