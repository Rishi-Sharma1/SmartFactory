import prisma from '../../config/db.js';

export const getUserFactories = async (userId) => {
  const userFactories = await prisma.userFactory.findMany({
    where: { userId, isActive: true },
    include: {
      factory: {
        include: {
          _count: {
            select: {
              lines: true,
              machines: true,
              members: true,
            },
          },
        },
      },
    },
  });

  return userFactories.map((uf) => ({
    factoryId: uf.factory.id,
    name: uf.factory.name,
    location: uf.factory.location,
    role: uf.role,
    joinedAt: uf.joinedAt,
    activeLinesCount: uf.factory._count.lines,
    machinesCount: uf.factory._count.machines,
    membersCount: uf.factory._count.members,
  }));
};

export const createFactory = async (userId, name, location) => {
  const factory = await prisma.factory.create({
    data: {
      name,
      location,
      members: {
        create: {
          userId,
          role: 'OWNER',
        },
      },
      alertConfig: {
        create: {
          productionThresholdPct: 80,
          rejectionThresholdPct: 5,
          machineIdleMinutes: 30,
        },
      },
    },
    include: {
      members: true,
    },
  });

  return factory;
};

export const updateFactory = async (factoryId, name, location) => {
  return prisma.factory.update({
    where: { id: factoryId },
    data: { name, location },
  });
};

export const inviteMember = async (factoryId, email, role) => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    throw { statusCode: 404, message: 'User with provided email does not exist' };
  }

  const membership = await prisma.userFactory.upsert({
    where: {
      userId_factoryId: {
        userId: user.id,
        factoryId,
      },
    },
    update: {
      role,
      isActive: true,
    },
    create: {
      userId: user.id,
      factoryId,
      role,
      isActive: true,
    },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return membership;
};

export const getFactoryMembers = async (factoryId) => {
  return prisma.userFactory.findMany({
    where: { factoryId, isActive: true },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      },
    },
  });
};

export const updateMemberRole = async (factoryId, targetUserId, newRole) => {
  return prisma.userFactory.update({
    where: {
      userId_factoryId: {
        userId: targetUserId,
        factoryId,
      },
    },
    data: { role: newRole },
  });
};

export const revokeMemberAccess = async (factoryId, targetUserId) => {
  return prisma.userFactory.update({
    where: {
      userId_factoryId: {
        userId: targetUserId,
        factoryId,
      },
    },
    data: { isActive: false },
  });
};
