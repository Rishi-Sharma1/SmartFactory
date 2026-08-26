import prisma from '../../config/db.js';

export const getNotifications = async (factoryId) => {
  return prisma.notification.findMany({
    where: { factoryId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
};

export const markAsRead = async (id, factoryId) => {
  return prisma.notification.updateMany({
    where: { id, factoryId },
    data: { isRead: true },
  });
};

export const markAllAsRead = async (factoryId) => {
  return prisma.notification.updateMany({
    where: { factoryId, isRead: false },
    data: { isRead: true },
  });
};

export const getAlertConfig = async (factoryId) => {
  let config = await prisma.alertConfig.findUnique({
    where: { factoryId },
  });

  if (!config) {
    config = await prisma.alertConfig.create({
      data: {
        factoryId,
        productionThresholdPct: 80,
        rejectionThresholdPct: 5,
        machineIdleMinutes: 30,
      },
    });
  }

  return config;
};

export const updateAlertConfig = async (factoryId, data) => {
  return prisma.alertConfig.upsert({
    where: { factoryId },
    update: data,
    create: {
      factoryId,
      ...data,
    },
  });
};
