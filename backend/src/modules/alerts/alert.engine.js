import prisma from '../../config/db.js';
import { emitToFactory } from '../../config/socket.js';

export const checkProductionAlerts = async (productionRecord, factoryId) => {
  try {
    const config = await prisma.alertConfig.findUnique({
      where: { factoryId },
    });

    const prodThreshold = config?.productionThresholdPct ?? 80;
    const rejThreshold = config?.rejectionThresholdPct ?? 5;

    const target = productionRecord.targetUnits || 1;
    const produced = productionRecord.producedUnits || 0;
    const rejected = productionRecord.rejectedUnits || 0;

    const efficiencyPct = (produced / target) * 100;
    const rejectionRatePct = produced > 0 ? (rejected / produced) * 100 : 0;

    // 1. Efficiency check
    if (efficiencyPct < prodThreshold) {
      const msg = `Low production efficiency on line: ${efficiencyPct.toFixed(1)}% (Target: ${prodThreshold}%)`;
      const notification = await prisma.notification.create({
        data: {
          factoryId,
          type: 'LOW_PRODUCTION',
          severity: 'WARNING',
          message: msg,
        },
      });

      emitToFactory(factoryId, 'alert:fired', notification);
    }

    // 2. Rejection rate check
    if (rejectionRatePct > rejThreshold) {
      const severity = rejectionRatePct > 10 ? 'CRITICAL' : 'WARNING';
      const msg = `High rejection rate detected: ${rejectionRatePct.toFixed(1)}% (${rejected} units rejected)`;
      const notification = await prisma.notification.create({
        data: {
          factoryId,
          type: 'HIGH_REJECTION',
          severity,
          message: msg,
        },
      });

      emitToFactory(factoryId, 'alert:fired', notification);
    }
  } catch (err) {
    console.error('Alert Engine Error (Production):', err.message);
  }
};

export const checkMachineAlerts = async (machine, alertType, extraDetails = '', factoryId) => {
  try {
    let severity = 'WARNING';
    let message = '';

    if (alertType === 'MACHINE_FAULT') {
      severity = 'CRITICAL';
      message = `Machine Fault reported on ${machine.name} (${machine.type}): ${extraDetails}`;
    } else if (alertType === 'MACHINE_IDLE') {
      severity = 'WARNING';
      message = `Machine ${machine.name} has been idle beyond threshold: ${extraDetails}`;
    }

    if (message) {
      const notification = await prisma.notification.create({
        data: {
          factoryId,
          type: alertType,
          severity,
          message,
        },
      });

      emitToFactory(factoryId, 'alert:fired', notification);
    }
  } catch (err) {
    console.error('Alert Engine Error (Machine):', err.message);
  }
};
