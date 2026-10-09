import prisma from '../../config/db.js';
import { emitToFactory } from '../../config/socket.js';
import { checkMachineAlerts } from '../alerts/alert.engine.js';

export const getMachines = async (factoryId) => {
  let machines = await prisma.machine.findMany({
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

  if (machines.length === 0) {
    let line = await prisma.productionLine.findFirst({ where: { factoryId } });
    if (!line) {
      line = await prisma.productionLine.create({
        data: { name: 'Production Line 1', factoryId },
      });
    }

    await prisma.machine.create({
      data: {
        factoryId,
        lineId: line.id,
        name: 'CNC Milling Unit 01',
        type: 'CNC Milling',
        status: 'ACTIVE',
        efficiencyPct: 100,
      },
    });

    machines = await prisma.machine.findMany({
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
  }

  return machines;
};


export const createMachine = async (data, factoryId) => {
  const { name, type, lineId, installDate } = data;
  return prisma.machine.create({
    data: {
      factoryId,
      lineId: lineId || null,
      name,
      type,
      installDate: installDate ? new Date(installDate) : null,
      status: 'ACTIVE',
      efficiencyPct: 100,
    },
  });
};


export const updateStatus = async (machineId, status, efficiencyPct, factoryId) => {
  const machine = await prisma.machine.findFirst({
    where: { id: machineId, factoryId },
  });

  if (!machine) {
    throw { statusCode: 404, message: 'Machine not found in this factory' };
  }

  const updatedMachine = await prisma.machine.update({
    where: { id: machineId },
    data: {
      status,
      ...(efficiencyPct !== undefined && { efficiencyPct }),
    },
  });

  if (status === 'IDLE') {
    checkMachineAlerts(updatedMachine, 'MACHINE_IDLE', 'Status changed to IDLE', factoryId);
  }

  if (status === 'ACTIVE') {
    await prisma.notification.updateMany({
      where: {
        factoryId,
        type: 'MACHINE_FAULT',
        isRead: false,
        message: { contains: updatedMachine.name },
      },
      data: { isRead: true },
    });
  }

  return updatedMachine;
};

export const logFault = async (machineId, reportedByUserId, faultDescription, factoryId) => {
  const machine = await prisma.machine.findFirst({
    where: { id: machineId, factoryId },
  });

  if (!machine) {
    throw { statusCode: 404, message: 'Machine not found in this factory' };
  }

  const updatedMachine = await prisma.machine.update({
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
    include: {
      reporter: { select: { id: true, name: true } },
      machine: { select: { id: true, name: true, status: true } },
    },
  });

  emitToFactory(factoryId, 'machine:fault', {
    machineId: updatedMachine.id,
    name: updatedMachine.name,
    description: faultDescription,
    severity: 'CRITICAL',
    reportedBy: log.reporter?.name || 'Operator',
  });

  checkMachineAlerts(updatedMachine, 'MACHINE_FAULT', faultDescription, factoryId);

  return {
    ...log,
    name: updatedMachine.name,
  };
};

export const resolveFault = async (machineId, resolvedByUserId, factoryId) => {
  const machine = await prisma.machine.findFirst({
    where: { id: machineId, factoryId },
  });

  if (!machine) {
    throw { statusCode: 404, message: 'Machine not found in this factory' };
  }

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

  // Automatically mark any active MACHINE_FAULT notifications for this machine as read
  await prisma.notification.updateMany({
    where: {
      factoryId,
      type: 'MACHINE_FAULT',
      isRead: false,
      message: { contains: updatedMachine.name },
    },
    data: { isRead: true },
  });

  emitToFactory(factoryId, 'machine:resolved', {
    machineId: updatedMachine.id,
    name: updatedMachine.name,
    downtimeMinutes,
  });

  return updatedMachine;
};

export const getMachineLogs = async (machineId, factoryId) => {
  if (factoryId) {
    const machine = await prisma.machine.findFirst({
      where: { id: machineId, factoryId },
    });

    if (!machine) {
      throw { statusCode: 404, message: 'Machine not found in this factory' };
    }
  }

  return prisma.maintenanceLog.findMany({
    where: { machineId },
    include: { reporter: { select: { name: true, email: true } } },
    orderBy: { createdAt: 'desc' },
  });
};

