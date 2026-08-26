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
