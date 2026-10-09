import prisma from '../../config/db.js';
import { emitToFactory } from '../../config/socket.js';
import { checkProductionAlerts } from '../alerts/alert.engine.js';

export const createOrUpdateProductionLog = async (data, userId, factoryId) => {
  let { shiftId, lineId, producedUnits, rejectedUnits, targetUnits, delayReason, notes, defects } = data;

  if (!shiftId) {
    const activeShift = await prisma.shift.findFirst({
      where: { factoryId, status: 'ACTIVE' },
    });
    if (!activeShift) {
      throw { statusCode: 400, message: 'No active shift is currently open. Please start a shift first.' };
    }
    shiftId = activeShift.id;
  } else {
    const shift = await prisma.shift.findFirst({
      where: { id: shiftId, factoryId, status: 'ACTIVE' },
    });
    if (!shift) {
      throw { statusCode: 400, message: 'Invalid or inactive shift' };
    }
  }

  // Look for target established by the Manager for this shift and line
  const existingRecord = await prisma.production.findFirst({
    where: { shiftId, lineId },
    orderBy: { recordedAt: 'desc' },
  });

  const finalTarget = targetUnits || existingRecord?.targetUnits || 0;

  const productionRecord = await prisma.production.create({
    data: {
      shiftId,
      lineId,
      supervisorId: userId,
      targetUnits: finalTarget,
      producedUnits,
      rejectedUnits: rejectedUnits || 0,
      delayReason,
      notes,
      defects: defects && defects.length > 0 ? {
        create: defects.map((d) => ({
          count: d.count,
          reason: d.reason,
          description: d.description,
        })),
      } : undefined,
    },
    include: {
      line: true,
      defects: true,
    },
  });

  emitToFactory(factoryId, 'production:updated', {
    lineId: productionRecord.lineId,
    lineName: productionRecord.line.name,
    producedUnits: productionRecord.producedUnits,
    targetUnits: productionRecord.targetUnits,
    rejectedUnits: productionRecord.rejectedUnits,
    timestamp: productionRecord.recordedAt,
  });

  checkProductionAlerts(productionRecord, factoryId);

  return productionRecord;
};

export const setTarget = async (data, factoryId, managerUserId) => {
  let { shiftId, lineId, targetUnits, shiftType } = data;

  if (!shiftId) {
    let targetShift;
    if (shiftType) {
      const normalizedType = shiftType.toUpperCase();
      targetShift = await prisma.shift.findFirst({
        where: { factoryId, type: normalizedType, status: 'ACTIVE' },
      });
    }

    if (!targetShift) {
      targetShift = await prisma.shift.findFirst({
        where: { factoryId, status: 'ACTIVE' },
      });
    }

    if (!targetShift) {
      const normalizedType = (shiftType || 'MORNING').toUpperCase();
      targetShift = await prisma.shift.create({
        data: {
          factoryId,
          type: normalizedType,
          supervisorId: managerUserId || '',
          startTime: new Date(),
          status: 'ACTIVE',
        },
      });
    }
    shiftId = targetShift.id;
  }

  const line = await prisma.productionLine.findFirst({
    where: { id: lineId, factoryId },
  });

  if (!line) {
    throw { statusCode: 404, message: 'Production line not found in this factory' };
  }

  const existing = await prisma.production.findFirst({
    where: { shiftId, lineId },
    orderBy: { recordedAt: 'desc' },
  });

  let record;
  if (existing) {
    record = await prisma.production.update({
      where: { id: existing.id },
      data: { targetUnits },
      include: { line: true },
    });
  } else {
    record = await prisma.production.create({
      data: {
        shiftId,
        lineId,
        supervisorId: managerUserId || '',
        targetUnits,
        producedUnits: 0,
        rejectedUnits: 0,
      },
      include: { line: true },
    });
  }

  emitToFactory(factoryId, 'production:target_set', {
    lineId: record.lineId,
    lineName: record.line?.name || line.name,
    targetUnits: record.targetUnits,
    shiftId,
  });

  emitToFactory(factoryId, 'production:updated', {
    lineId: record.lineId,
    lineName: record.line?.name || line.name,
    producedUnits: record.producedUnits,
    targetUnits: record.targetUnits,
    rejectedUnits: record.rejectedUnits,
    timestamp: record.recordedAt,
  });

  return record;
};

export const getProductionLines = async (factoryId) => {
  const activeShift = await prisma.shift.findFirst({
    where: { factoryId, status: 'ACTIVE' },
    orderBy: { createdAt: 'desc' },
  });

  let lines = await prisma.productionLine.findMany({
    where: { factoryId },
  });

  if (lines.length === 0) {
    const defaultLine = await prisma.productionLine.create({
      data: {
        name: 'Production Line 1',
        factoryId,
      },
    });

    await prisma.machine.create({
      data: {
        factoryId,
        lineId: defaultLine.id,
        name: 'CNC Milling Unit 01',
        type: 'CNC Milling',
        status: 'ACTIVE',
        efficiencyPct: 100,
      },
    });

    lines = [defaultLine];
  }

  const shiftId = activeShift?.id;


  const logs = shiftId
    ? await prisma.production.findMany({
        where: { shiftId },
        orderBy: { recordedAt: 'desc' },
      })
    : [];

  return lines.map((line) => {
    const lineLogs = logs.filter((l) => l.lineId === line.id);
    const latestLog = lineLogs[0];
    const totalProduced = lineLogs.reduce((acc, l) => acc + l.producedUnits, 0);
    const totalRejected = lineLogs.reduce((acc, l) => acc + l.rejectedUnits, 0);
    const hasTarget = Boolean(latestLog && latestLog.targetUnits && latestLog.targetUnits > 0);
    const target = hasTarget ? latestLog.targetUnits : 0;
    const efficiency = target > 0 ? Math.min(100, Math.round((totalProduced / target) * 100)) : 0;
    const gross = totalProduced + totalRejected;
    const yieldRate = gross > 0 ? parseFloat(((totalProduced / gross) * 100).toFixed(1)) : 100;

    return {
      id: line.id,
      name: line.name,
      target,
      targetUnits: target,
      hasTarget,
      produced: totalProduced,
      unitsProduced: totalProduced,
      rejects: totalRejected,
      unitsRejected: totalRejected,
      efficiency,
      yieldRate,
      status: totalRejected > 15 ? 'Degraded' : 'Optimal',
      operator: 'Floor Operator',
    };
  });
};

export const getProductionLogs = async (factoryId, shiftId) => {
  const whereClause = {
    line: { factoryId },
  };
  if (shiftId) {
    whereClause.shiftId = shiftId;
  }

  return prisma.production.findMany({
    where: whereClause,
    include: {
      line: true,
      supervisor: { select: { id: true, name: true, email: true } },
      defects: true,
    },
    orderBy: { recordedAt: 'desc' },
  });
};

const computeShiftTargetFromLogs = (logs) => {
  if (!logs || logs.length === 0) return 0;
  const lineTargets = new Map();
  for (const log of logs) {
    if (log.targetUnits && log.targetUnits > 0) {
      if (!lineTargets.has(log.lineId) || lineTargets.get(log.lineId) === 0) {
        lineTargets.set(log.lineId, log.targetUnits);
      }
    } else if (!lineTargets.has(log.lineId)) {
      lineTargets.set(log.lineId, 0);
    }
  }
  return Array.from(lineTargets.values()).reduce((sum, val) => sum + val, 0);
};

export const getProductionSummary = async (factoryId) => {
  const activeShift = await prisma.shift.findFirst({
    where: { factoryId, status: 'ACTIVE' },
    include: { supervisor: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  if (!activeShift) {
    const lastShift = await prisma.shift.findFirst({
      where: { factoryId },
      include: { supervisor: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    if (lastShift) {
      const logs = await prisma.production.findMany({
        where: { shiftId: lastShift.id },
        orderBy: { recordedAt: 'desc' },
      });
      const totalProduced = logs.reduce((acc, curr) => acc + curr.producedUnits, 0);
      const totalTarget = computeShiftTargetFromLogs(logs);
      const totalRejected = logs.reduce((acc, curr) => acc + curr.rejectedUnits, 0);
      const efficiencyPct = totalTarget > 0 ? parseFloat(((totalProduced / totalTarget) * 100).toFixed(1)) : 0;
      const activeLinesCount = new Set(logs.map((l) => l.lineId)).size;

      return {
        activeShift: null,
        lastShift: {
          id: lastShift.id,
          type: lastShift.type,
          supervisorName: lastShift.supervisor?.name || 'Supervisor',
          startTime: lastShift.startTime,
          endTime: lastShift.endTime,
          status: lastShift.status,
          aiDigest: lastShift.aiDigest,
        },
        producedUnits: totalProduced,
        targetUnits: totalTarget,
        rejectedUnits: totalRejected,
        efficiencyPct,
        activeLinesCount,
      };
    }

    return {
      activeShift: null,
      lastShift: null,
      producedUnits: 0,
      targetUnits: 0,
      rejectedUnits: 0,
      efficiencyPct: 0,
      activeLinesCount: 0,
    };
  }

  const logs = await prisma.production.findMany({
    where: { shiftId: activeShift.id },
    orderBy: { recordedAt: 'desc' },
  });

  const totalProduced = logs.reduce((acc, curr) => acc + curr.producedUnits, 0);
  const totalTarget = computeShiftTargetFromLogs(logs);
  const totalRejected = logs.reduce((acc, curr) => acc + curr.rejectedUnits, 0);

  const efficiencyPct = totalTarget > 0 ? parseFloat(((totalProduced / totalTarget) * 100).toFixed(1)) : 0;

  const activeLinesCount = new Set(logs.map((l) => l.lineId)).size;

  return {
    activeShift: {
      id: activeShift.id,
      type: activeShift.type,
      supervisorName: activeShift.supervisor?.name || 'Supervisor',
      startTime: activeShift.startTime,
      endTime: activeShift.endTime,
      status: activeShift.status,
      aiDigest: activeShift.aiDigest,
    },
    lastShift: null,
    producedUnits: totalProduced,
    targetUnits: totalTarget,
    rejectedUnits: totalRejected,
    efficiencyPct,
    activeLinesCount,
  };
};

export const createProductionLine = async (factoryId, name) => {
  return prisma.productionLine.create({
    data: {
      factoryId,
      name,
    },
  });
};

