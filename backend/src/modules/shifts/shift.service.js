import prisma from '../../config/db.js';
import { emitToFactory } from '../../config/socket.js';
import * as aiService from '../../services/ai.service.js';

export const openShift = async (type, supervisorId, factoryId) => {
  const existingActive = await prisma.shift.findFirst({
    where: { factoryId, status: 'ACTIVE' },
  });

  if (existingActive) {
    throw { statusCode: 400, message: `Active shift (${existingActive.type}) is already running` };
  }

  const shift = await prisma.shift.create({
    data: {
      factoryId,
      type,
      supervisorId,
      startTime: new Date(),
      status: 'ACTIVE',
    },
    include: {
      supervisor: { select: { id: true, name: true, email: true } },
    },
  });

  emitToFactory(factoryId, 'shift:started', {
    shiftId: shift.id,
    type: shift.type,
    supervisorName: shift.supervisor.name,
    startTime: shift.startTime,
  });

  return shift;
};

export const closeShift = async (shiftId, factoryId) => {
  const shift = await prisma.shift.findFirst({
    where: { id: shiftId, factoryId, status: 'ACTIVE' },
    include: {
      supervisor: true,
      production: true,
    },
  });

  if (!shift) {
    throw { statusCode: 404, message: 'Active shift not found' };
  }

  const endTime = new Date();
  const totalProduced = shift.production.reduce((acc, curr) => acc + curr.producedUnits, 0);
  const totalTarget = shift.production.reduce((acc, curr) => acc + curr.targetUnits, 0);
  const totalRejected = shift.production.reduce((acc, curr) => acc + curr.rejectedUnits, 0);
  const efficiencyPct = totalTarget > 0 ? parseFloat(((totalProduced / totalTarget) * 100).toFixed(1)) : 0;

  const shiftSummaryData = {
    shiftId: shift.id,
    type: shift.type,
    supervisorName: shift.supervisor.name,
    totalProduced,
    totalTarget,
    totalRejected,
    efficiencyPct,
    linesCount: new Set(shift.production.map((p) => p.lineId)).size,
  };

  let aiDigest = null;
  try {
    aiDigest = await aiService.generateShiftDigest(shiftSummaryData);
  } catch (err) {
    console.error('Non-blocking AI shift digest generation failed:', err.message);
    aiDigest = `Shift ${shift.type} completed. Efficiency: ${efficiencyPct}%. Total Produced: ${totalProduced}.`;
  }

  const updatedShift = await prisma.shift.update({
    where: { id: shift.id },
    data: {
      status: 'COMPLETED',
      endTime,
      aiDigest,
    },
  });

  emitToFactory(factoryId, 'shift:ended', {
    shiftId: updatedShift.id,
    summary: shiftSummaryData,
    aiDigest,
  });

  return updatedShift;
};

export const getShifts = async (factoryId) => {
  return prisma.shift.findMany({
    where: { factoryId },
    include: {
      supervisor: { select: { id: true, name: true } },
      _count: { select: { production: true, attendance: true } },
    },
    orderBy: { startTime: 'desc' },
  });
};
