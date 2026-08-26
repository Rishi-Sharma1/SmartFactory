import prisma from '../../config/db.js';
import { emitToFactory } from '../../config/socket.js';
import { checkProductionAlerts } from '../alerts/alert.engine.js';

export const createOrUpdateProductionLog = async (data, supervisorId, factoryId) => {
  const { shiftId, lineId, producedUnits, rejectedUnits, targetUnits, delayReason, notes, defects } = data;

  const shift = await prisma.shift.findFirst({
    where: { id: shiftId, factoryId, status: 'ACTIVE' },
  });

  if (!shift) {
    throw { statusCode: 400, message: 'Invalid or inactive shift' };
  }

  const existingRecord = await prisma.production.findFirst({
    where: { shiftId, lineId },
  });

  const finalTarget = targetUnits || existingRecord?.targetUnits || 100;

  const productionRecord = await prisma.production.create({
    data: {
      shiftId,
      lineId,
      supervisorId,
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

export const setTarget = async (data, factoryId) => {
  const { shiftId, lineId, targetUnits } = data;

  const existing = await prisma.production.findFirst({
    where: { shiftId, lineId },
    orderBy: { recordedAt: 'desc' },
  });

  if (existing) {
    return prisma.production.update({
      where: { id: existing.id },
      data: { targetUnits },
    });
  }

  return prisma.production.create({
    data: {
      shiftId,
      lineId,
      supervisorId: '',
      targetUnits,
      producedUnits: 0,
      rejectedUnits: 0,
    },
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

export const getProductionSummary = async (factoryId) => {
  const activeShift = await prisma.shift.findFirst({
    where: { factoryId, status: 'ACTIVE' },
    include: { supervisor: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  if (!activeShift) {
    return {
      activeShift: null,
      producedUnits: 0,
      targetUnits: 0,
      rejectedUnits: 0,
      efficiencyPct: 0,
      activeLinesCount: 0,
    };
  }

  const logs = await prisma.production.findMany({
    where: { shiftId: activeShift.id },
  });

  const totalProduced = logs.reduce((acc, curr) => acc + curr.producedUnits, 0);
  const totalTarget = logs.reduce((acc, curr) => acc + curr.targetUnits, 0);
  const totalRejected = logs.reduce((acc, curr) => acc + curr.rejectedUnits, 0);

  const efficiencyPct = totalTarget > 0 ? parseFloat(((totalProduced / totalTarget) * 100).toFixed(1)) : 0;

  const activeLinesCount = new Set(logs.map((l) => l.lineId)).size;

  return {
    activeShift: {
      id: activeShift.id,
      type: activeShift.type,
      supervisorName: activeShift.supervisor.name,
      startTime: activeShift.startTime,
    },
    producedUnits: totalProduced,
    targetUnits: totalTarget,
    rejectedUnits: totalRejected,
    efficiencyPct,
    activeLinesCount,
  };
};
