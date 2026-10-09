import bcrypt from 'bcrypt';
import prisma from '../../config/db.js';

export const createFactoryMember = async (factoryId, requesterRole, { name, email, password, role }) => {
  // Permission Matrix:
  // OWNER can create: OWNER, MANAGER, SUPERVISOR, OPERATOR
  // MANAGER can create: SUPERVISOR, OPERATOR
  if (requesterRole === 'MANAGER' && !['SUPERVISOR', 'OPERATOR'].includes(role)) {
    throw { statusCode: 403, message: 'Managers can only provision Supervisors and Operators/Belt Managers' };
  }
  if (requesterRole !== 'OWNER' && requesterRole !== 'MANAGER') {
    throw { statusCode: 403, message: 'Only Owners and Managers can create user accounts' };
  }

  let user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    const passwordHash = await bcrypt.hash(password, 10);
    user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });
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

export const createFactory = async (userId, name, location, lines = []) => {
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

  if (Array.isArray(lines) && lines.length > 0) {
    for (const lineEntry of lines) {
      const lineName = typeof lineEntry === 'string' ? lineEntry : lineEntry?.name;
      if (lineName && lineName.trim()) {
        const createdLine = await prisma.productionLine.create({
          data: {
            name: lineName.trim(),
            factoryId: factory.id,
          },
        });

        if (lineEntry && typeof lineEntry === 'object' && Array.isArray(lineEntry.machines)) {
          for (const m of lineEntry.machines) {
            if (m.name && m.name.trim()) {
              await prisma.machine.create({
                data: {
                  factoryId: factory.id,
                  lineId: createdLine.id,
                  name: m.name.trim(),
                  type: m.type || 'General Equipment',
                  status: 'ACTIVE',
                  efficiencyPct: 100,
                },
              });
            }
          }
        }
      }
    }
  }

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

export const updateMemberRole = async (factoryId, requesterRole, targetUserId, newRole) => {
  const targetMember = await prisma.userFactory.findUnique({
    where: {
      userId_factoryId: {
        userId: targetUserId,
        factoryId,
      },
    },
  });

  if (!targetMember) {
    throw { statusCode: 404, message: 'Member not found in factory' };
  }

  if (requesterRole === 'MANAGER') {
    if (['OWNER', 'MANAGER'].includes(targetMember.role) || ['OWNER', 'MANAGER'].includes(newRole)) {
      throw { statusCode: 403, message: 'Managers can only modify roles for Supervisors and Operators' };
    }
  }

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

export const revokeMemberAccess = async (factoryId, requesterRole, targetUserId) => {
  const targetMember = await prisma.userFactory.findUnique({
    where: {
      userId_factoryId: {
        userId: targetUserId,
        factoryId,
      },
    },
  });

  if (!targetMember) {
    throw { statusCode: 404, message: 'Member not found in factory' };
  }

  if (requesterRole === 'MANAGER' && ['OWNER', 'MANAGER'].includes(targetMember.role)) {
    throw { statusCode: 403, message: 'Managers cannot revoke access for Owners or other Managers' };
  }

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


export const deleteFactory = async (factoryId, userId) => {
  const membership = await prisma.userFactory.findUnique({
    where: {
      userId_factoryId: {
        userId,
        factoryId,
      },
    },
  });

  if (!membership || membership.role !== 'OWNER') {
    throw { statusCode: 403, message: 'Only the factory owner can delete this factory' };
  }

  return prisma.factory.delete({
    where: { id: factoryId },
  });
};

