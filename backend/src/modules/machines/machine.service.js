import prisma from '../../config/db.js';
import { emitToFactory } from '../../config/socket.js';
import { checkMachineAlerts } from '../alerts/alert.engine.js';

export const getMachines = async (factoryId) => {
  return prisma.machine.findMany({
    where: { factoryId },
    include: {
      maintenanceLogs: {
        take: 3,
        orderBy: { createdAt: 'desc' },
        include: { reporter: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const createMachine = async (data, factoryId) => {
  const { name, type, installDate } = data;
  return prisma.machine.create({
    data: {
      factoryId,
      name,
      type,
      installDate: installDate ? new Date(installDate) : null,
      status: 'ACTIVE',
      efficiencyPct: 100,
    },
  });
};

export const updateStatus = async (machineId, status, efficiencyPct, factoryId) => {
  const machine = await prisma.machine.update({
    where: { id: machineId },
    data: {
      status,
      ...(efficiencyPct !== undefined && { efficiencyPct }),
    },
  });

  if (status === 'IDLE') {
    checkMachineAlerts(machine, 'MACHINE_IDLE', 'Status changed to IDLE', factoryId);
  }

  return machine;
};

export const logFault = async (machineId, reportedByUserId, faultDescription, factoryId) => {
  const machine = await prisma.machine.update({
    where: { id: machineId },
    data: { status: 'FAULT' },
  });

  const log = await prisma.maintenanceLog.create({
    data: {
      machineId,
      reportedBy: reportedByUserId,
      faultDescription,
      downtimeStart: new Date(),
      maintenanceType: 'CORRECTIVE',
    },
    include: { reporter: { select: { id: true, name: true } } },
  });

  emitToFactory(factoryId, 'machine:fault', {
    machineId: machine.id,
    name: machine.name,
    description: faultDescription,
    severity: 'CRITICAL',
    reportedBy: log.reporter.name,
  });

  checkMachineAlerts(machine, 'MACHINE_FAULT', faultDescription, factoryId);

  return log;
};

export const resolveFault = async (machineId, resolvedByUserId, factoryId) => {
  const openLog = await prisma.maintenanceLog.findFirst({
    where: { machineId, downtimeEnd: null },
    orderBy: { downtimeStart: 'desc' },
  });

  const downtimeEnd = new Date();
  let downtimeMinutes = 0;

  if (openLog) {
    downtimeMinutes = Math.round((downtimeEnd.getTime() - openLog.downtimeStart.getTime()) / (1000 * 60));
    await prisma.maintenanceLog.update({
      where: { id: openLog.id },
      data: {
        downtimeEnd,
        resolvedBy: resolvedByUserId,
      },
    });
  }

  const updatedMachine = await prisma.machine.update({
    where: { id: machineId },
    data: {
      status: 'ACTIVE',
      lastMaintenance: downtimeEnd,
    },
  });

  emitToFactory(factoryId, 'machine:resolved', {
    machineId: updatedMachine.id,
    name: updatedMachine.name,
    downtimeMinutes,
  });

  return updatedMachine;
};

export const getMachineLogs = async (machineId) => {
  return prisma.maintenanceLog.findMany({
    where: { machineId },
    include: { reporter: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });
};
