import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../../config/db.js';
import env from '../../config/env.js';

export const login = async (email, password) => {
  let user;
  try {
    user = await prisma.user.findUnique({
      where: { email },
      include: {
        factories: {
          include: {
            factory: true,
          },
        },
      },
    });
  } catch (err) {
    if (err.code === 'P1001' || err.name === 'PrismaClientInitializationError') {
      throw { statusCode: 503, message: 'Database connection unavailable. Please configure DATABASE_URL in .env' };
    }
    throw err;
  }

  if (!user) {
    throw { statusCode: 401, message: 'Invalid credentials' };
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw { statusCode: 401, message: 'Invalid credentials' };
  }

  const factoriesPayload = user.factories.map((uf) => ({
    factoryId: uf.factoryId,
    factoryName: uf.factory.name,
    role: uf.role,
  }));

  const tokenPayload = {
    sub: user.id,
    email: user.email,
    name: user.name,
    factories: factoriesPayload,
  };

  const accessToken = jwt.sign(tokenPayload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES,
  });

  const refreshToken = jwt.sign({ sub: user.id }, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES,
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      factories: factoriesPayload,
    },
  };
};

export const refreshToken = async (refreshTokenStr) => {
  try {
    const decoded = jwt.verify(refreshTokenStr, env.JWT_REFRESH_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
      include: {
        factories: {
          include: { factory: true },
        },
      },
    });

    if (!user) {
      throw { statusCode: 401, message: 'User not found' };
    }

    const factoriesPayload = user.factories.map((uf) => ({
      factoryId: uf.factoryId,
      factoryName: uf.factory.name,
      role: uf.role,
    }));

    const tokenPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      factories: factoriesPayload,
    };

    const newAccessToken = jwt.sign(tokenPayload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_EXPIRES,
    });

    return { accessToken: newAccessToken };
  } catch (err) {
    throw { statusCode: 401, message: 'Invalid or expired refresh token' };
  }
};

export const getMe = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      factories: {
        include: {
          factory: true,
        },
      },
    },
  });

  if (!user) {
    throw { statusCode: 404, message: 'User not found' };
  }

  return user;
};

export const register = async (data) => {
  const { name, email, password, role = 'OWNER', factories = [] } = data;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw { statusCode: 400, message: 'User with this email already exists' };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
    },
  });

  for (const factoryData of factories) {
    const createdFactory = await prisma.factory.create({
      data: {
        name: factoryData.name,
        location: factoryData.location || null,
        members: {
          create: {
            userId: user.id,
            role,
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
    });

    if (Array.isArray(factoryData.lines) && factoryData.lines.length > 0) {
      for (const lineEntry of factoryData.lines) {
        const lineName = typeof lineEntry === 'string' ? lineEntry : lineEntry?.name;
        if (lineName && lineName.trim()) {
          const createdLine = await prisma.productionLine.create({
            data: {
              name: lineName.trim(),
              factoryId: createdFactory.id,
            },
          });

          if (lineEntry && typeof lineEntry === 'object' && Array.isArray(lineEntry.machines)) {
            for (const m of lineEntry.machines) {
              if (m.name && m.name.trim()) {
                await prisma.machine.create({
                  data: {
                    factoryId: createdFactory.id,
                    lineId: createdLine.id,
                    name: m.name.trim(),
                    type: m.type || 'General Equipment',
                    status: m.status || 'ACTIVE',
                    efficiencyPct: m.efficiencyPct ?? 100,
                  },
                });
              }
            }
          }
        }
      }
    }

    if (Array.isArray(factoryData.machines) && factoryData.machines.length > 0) {
      for (const m of factoryData.machines) {
        if (m.name && m.name.trim()) {
          await prisma.machine.create({
            data: {
              factoryId: createdFactory.id,
              name: m.name.trim(),
              type: m.type || 'General Equipment',
              status: m.status || 'ACTIVE',
              efficiencyPct: m.efficiencyPct ?? 100,
            },
          });
        }
      }
    }

  }

  return login(email, password);
};

