import express from 'express';
import * as attendanceController from './attendance.controller.js';
import authenticateToken from '../../middleware/auth.middleware.js';
import { resolveFactoryContext, requireRole } from '../../middleware/rbac.middleware.js';
import validate from '../../middleware/validate.js';
import {
  selfCheckInSchema,
  selfCheckOutSchema,
  markAttendanceSchema,
} from './attendance.schema.js';

const router = express.Router();

router.use(authenticateToken, resolveFactoryContext);

router.post('/checkin', validate(selfCheckInSchema), attendanceController.selfCheckIn);
router.put('/:id/checkout', validate(selfCheckOutSchema), attendanceController.selfCheckOut);
router.put('/:id/mark', requireRole('SUPERVISOR', 'MANAGER', 'OWNER'), validate(markAttendanceSchema), attendanceController.markAttendance);
router.get('/shift/:shiftId', attendanceController.getShiftAttendance);

export default router;
