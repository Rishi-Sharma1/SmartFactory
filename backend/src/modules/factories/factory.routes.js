import express from 'express';
import * as factoryController from './factory.controller.js';
import authenticateToken from '../../middleware/auth.middleware.js';
import { resolveFactoryContext, requireRole } from '../../middleware/rbac.middleware.js';
import validate from '../../middleware/validate.js';
import {
  createFactorySchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
  createMemberSchema,
} from './factory.schema.js';

const router = express.Router();

router.use(authenticateToken);

// User's own factories list
router.get('/', factoryController.getUserFactories);
router.post('/', validate(createFactorySchema), factoryController.createFactory);

// Specific factory operations (Owner guarded)
router.put('/:id', resolveFactoryContext, requireRole('OWNER'), factoryController.updateFactory);
router.delete('/:id', resolveFactoryContext, requireRole('OWNER'), factoryController.deleteFactory);
router.post('/:id/invite', resolveFactoryContext, requireRole('OWNER'), validate(inviteMemberSchema), factoryController.inviteMember);

// Member management (Owner and Manager accessible according to hierarchy)
router.get('/:id/members', resolveFactoryContext, requireRole('OWNER', 'MANAGER'), factoryController.getFactoryMembers);
router.post('/:id/members', resolveFactoryContext, requireRole('OWNER', 'MANAGER'), validate(createMemberSchema), factoryController.createMember);
router.put('/:id/members/:userId', resolveFactoryContext, requireRole('OWNER', 'MANAGER'), validate(updateMemberRoleSchema), factoryController.updateMemberRole);
router.delete('/:id/members/:userId', resolveFactoryContext, requireRole('OWNER', 'MANAGER'), factoryController.revokeMemberAccess);

export default router;

