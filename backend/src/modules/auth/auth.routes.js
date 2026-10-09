import express from 'express';
import * as authController from './auth.controller.js';
import authenticateToken from '../../middleware/auth.middleware.js';
import validate from '../../middleware/validate.js';
import { loginSchema, refreshSchema, registerSchema } from './auth.schema.js';

const router = express.Router();

router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.post('/logout', authenticateToken, authController.logout);
router.get('/me', authenticateToken, authController.getMe);

export default router;

