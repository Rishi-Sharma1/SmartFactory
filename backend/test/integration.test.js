import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import jwt from 'jsonwebtoken';

import app from '../src/app.js';
import env from '../src/config/env.js';

test('GET /health returns server status ok', async () => {
  const res = await request(app).get('/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
  assert.ok(res.body.timestamp);
});

test('POST /api/v1/auth/login handles credentials or DB unavailable status', async () => {
  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'nonexistent@factory.com', password: 'wrongpassword' });
  assert.ok(res.status === 401 || res.status === 503);
});

test('Protected endpoint requires Authorization header', async () => {
  const res = await request(app).get('/api/v1/factories');
  assert.equal(res.status, 401);
  assert.equal(res.body.error, 'Authentication token required');
});

test('Tenant-scoped endpoint requires X-Factory-ID header', async () => {
  const token = jwt.sign({ sub: 'test-user-id' }, env.JWT_ACCESS_SECRET);

  const res = await request(app)
    .get('/api/v1/production')
    .set('Authorization', `Bearer ${token}`);

  assert.equal(res.status, 400);
  assert.equal(res.body.error, 'X-Factory-ID header is required for this operation');
});
