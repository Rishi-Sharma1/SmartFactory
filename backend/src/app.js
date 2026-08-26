import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import env from './config/env.js';
import errorHandler from './middleware/errorHandler.js';

import authRoutes from './modules/auth/auth.routes.js';
import factoryRoutes from './modules/factories/factory.routes.js';
import productionRoutes from './modules/production/production.routes.js';
import shiftRoutes from './modules/shifts/shift.routes.js';
import machineRoutes from './modules/machines/machine.routes.js';
import attendanceRoutes from './modules/attendance/attendance.routes.js';
import notificationRoutes from './modules/notifications/notification.routes.js';
import reportRoutes from './modules/reports/report.routes.js';
import queryRoutes from './modules/query/query.routes.js';

const app = express();

// Security & Utility Middleware
app.use(helmet());
app.use(
  cors({
    origin: [env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:3000'],
    credentials: true,
  })
);

if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  message: { error: 'Too many requests from this IP, please try again later.' },
});
app.use('/api', apiLimiter);

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV,
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/factories', factoryRoutes);
app.use('/api/v1/production', productionRoutes);
app.use('/api/v1/shifts', shiftRoutes);
app.use('/api/v1/machines', machineRoutes);
app.use('/api/v1/attendance', attendanceRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/query', queryRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;
