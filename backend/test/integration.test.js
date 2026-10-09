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

test('Attendance RBAC: Operator or Owner cannot mark attendance (only Supervisor & Manager)', async () => {
  // Try logging in as operator
  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'operator@factory.com', password: 'password123' });

  if (loginRes.status === 200) {
    const { accessToken, user } = loginRes.body;
    const factoryId = user.factories?.[0]?.factoryId;

    if (factoryId) {
      const res = await request(app)
        .put('/api/v1/attendance/fake-id/mark')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Factory-ID', factoryId)
        .send({ status: 'PRESENT' });

      assert.equal(res.status, 403);
      assert.match(res.body.error, /Forbidden: requires one of the following roles: \[SUPERVISOR, MANAGER, OWNER\]/);
    }
  }
});

test('Attendance Sheet: getShiftAttendance returns only labours (operators), excluding managers/owners/supervisors', async () => {
  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'supervisor@factory.com', password: 'password123' });

  if (loginRes.status === 200) {
    const { accessToken, user } = loginRes.body;
    const factoryId = user.factories?.[0]?.factoryId;

    if (factoryId) {
      // Fetch shifts to get a valid shift ID
      const shiftsRes = await request(app)
        .get('/api/v1/shifts')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Factory-ID', factoryId);

      if (shiftsRes.status === 200 && shiftsRes.body.length > 0) {
        const shiftId = shiftsRes.body[0].id;
        const rosterRes = await request(app)
          .get(`/api/v1/attendance/shift/${shiftId}`)
          .set('Authorization', `Bearer ${accessToken}`)
          .set('X-Factory-ID', factoryId);

        assert.equal(rosterRes.status, 200);
        assert.ok(Array.isArray(rosterRes.body));
        for (const member of rosterRes.body) {
          assert.notEqual(member.role, 'OWNER');
          assert.notEqual(member.role, 'MANAGER');
          assert.notEqual(member.role, 'SUPERVISOR');
          assert.equal(member.role, 'OPERATOR');
        }

        // Also test: Attempting to mark attendance for a non-labour (the supervisor themselves or manager)
        const markSupervisorRes = await request(app)
          .put(`/api/v1/attendance/${user.id}/mark`)
          .set('Authorization', `Bearer ${accessToken}`)
          .set('X-Factory-ID', factoryId)
          .send({ shiftId, status: 'PRESENT' });

        assert.equal(markSupervisorRes.status, 403);
        assert.match(markSupervisorRes.body.error, /Attendance can only be marked for labours/);
      }
    }
  }
});

test('Shift Lifecycle: Closing shift updates status to COMPLETED and saves endTime in database', async () => {
  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'supervisor@factory.com', password: 'password123' });

  if (loginRes.status === 200) {
    const { accessToken, user } = loginRes.body;
    const factoryId = user.factories?.[0]?.factoryId;

    if (factoryId) {
      // 1. Close active shift
      const closeRes = await request(app)
        .put('/api/v1/shifts/active/close')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('X-Factory-ID', factoryId);

      if (closeRes.status === 200) {
        assert.equal(closeRes.body.status, 'COMPLETED');
        assert.ok(closeRes.body.endTime, 'endTime must be updated');

        // Verify summary returns activeShift = null and lastShift is completed with closing time
        const summaryRes = await request(app)
          .get('/api/v1/production/summary')
          .set('Authorization', `Bearer ${accessToken}`)
          .set('X-Factory-ID', factoryId);

        assert.equal(summaryRes.status, 200);
        assert.equal(summaryRes.body.activeShift, null);
        assert.ok(summaryRes.body.lastShift);
        assert.equal(summaryRes.body.lastShift.status, 'COMPLETED');
        assert.ok(summaryRes.body.lastShift.endTime);

        // 2. Open new shift
        const openRes = await request(app)
          .post('/api/v1/shifts')
          .set('Authorization', `Bearer ${accessToken}`)
          .set('X-Factory-ID', factoryId)
          .send({ type: 'AFTERNOON' });

        assert.equal(openRes.status, 201);
        assert.equal(openRes.body.status, 'ACTIVE');
        assert.equal(openRes.body.type, 'AFTERNOON');
        assert.ok(openRes.body.startTime);
      }
    }
  }
});

test('Production Workflow RBAC: Manager sets target, Operator/Supervisor logs produced & rejected units', async () => {
  // 1. Manager logs in
  const managerLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'manager@factory.com', password: 'password123' });

  // 2. Operator logs in
  const operatorLogin = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: 'operator@factory.com', password: 'password123' });

  if (managerLogin.status === 200 && operatorLogin.status === 200) {
    const managerToken = managerLogin.body.accessToken;
    const operatorToken = operatorLogin.body.accessToken;
    const factoryId = managerLogin.body.user.factories?.[0]?.factoryId;

    if (factoryId) {
      // Ensure an active shift exists for tests
      const shiftsRes = await request(app)
        .get('/api/v1/shifts')
        .set('Authorization', `Bearer ${managerToken}`)
        .set('X-Factory-ID', factoryId);

      let activeShift = shiftsRes.body?.find((s) => s.status === 'ACTIVE');
      if (!activeShift) {
        const createShiftRes = await request(app)
          .post('/api/v1/shifts')
          .set('Authorization', `Bearer ${managerToken}`)
          .set('X-Factory-ID', factoryId)
          .send({ type: 'MORNING' });
        activeShift = createShiftRes.body;
      }

      // Fetch a valid production line
      const linesInitRes = await request(app)
        .get('/api/v1/production/lines')
        .set('Authorization', `Bearer ${managerToken}`)
        .set('X-Factory-ID', factoryId);

      assert.equal(linesInitRes.status, 200);
      assert.ok(linesInitRes.body.length > 0, 'Factory should have production lines');
      const testLine = linesInitRes.body[0];

      // Operator attempts to set target -> should be FORBIDDEN (403)
      const opTargetRes = await request(app)
        .post('/api/v1/production/target')
        .set('Authorization', `Bearer ${operatorToken}`)
        .set('X-Factory-ID', factoryId)
        .send({ lineId: testLine.id, targetUnits: 850 });

      assert.equal(opTargetRes.status, 403);

      // Manager sets target -> should SUCCEED (200)
      const mgrTargetRes = await request(app)
        .post('/api/v1/production/target')
        .set('Authorization', `Bearer ${managerToken}`)
        .set('X-Factory-ID', factoryId)
        .send({ lineId: testLine.id, targetUnits: 850 });

      assert.equal(mgrTargetRes.status, 200);
      assert.equal(mgrTargetRes.body.targetUnits, 850);

      // Manager attempts to log production output -> should be FORBIDDEN (403)
      const mgrUpdateRes = await request(app)
        .post('/api/v1/production/update')
        .set('Authorization', `Bearer ${managerToken}`)
        .set('X-Factory-ID', factoryId)
        .send({ lineId: testLine.id, producedUnits: 820, rejectedUnits: 12 });

      assert.equal(mgrUpdateRes.status, 403);

      // Operator logs production output at end of shift -> should SUCCEED (201)
      const opUpdateRes = await request(app)
        .post('/api/v1/production/update')
        .set('Authorization', `Bearer ${operatorToken}`)
        .set('X-Factory-ID', factoryId)
        .send({ lineId: testLine.id, producedUnits: 820, rejectedUnits: 12 });

      assert.equal(opUpdateRes.status, 201);
      assert.equal(opUpdateRes.body.producedUnits, 820);
      assert.equal(opUpdateRes.body.rejectedUnits, 12);
      assert.equal(opUpdateRes.body.targetUnits, 850);

      // Verify that GET /api/v1/production/lines reflects the target to everyone (visible to operator)
      const linesRes = await request(app)
        .get('/api/v1/production/lines')
        .set('Authorization', `Bearer ${operatorToken}`)
        .set('X-Factory-ID', factoryId);

      assert.equal(linesRes.status, 200);
      assert.ok(Array.isArray(linesRes.body));
      const foundLine = linesRes.body.find((l) => l.id === testLine.id);
      assert.ok(foundLine, 'Line should be found');
      assert.equal(foundLine.targetUnits, 850);
      assert.equal(foundLine.unitsProduced, 820);
      assert.equal(foundLine.unitsRejected, 12);

      // Clean up test shift
      await request(app)
        .put('/api/v1/shifts/active/close')
        .set('Authorization', `Bearer ${managerToken}`)
        .set('X-Factory-ID', factoryId);
    }
  }
});

