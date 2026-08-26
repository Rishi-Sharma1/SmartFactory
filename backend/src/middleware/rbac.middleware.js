import prisma from '../config/db.js';

/**
 * Resolves active factory from X-Factory-ID header and validates user membership.
 */
export const resolveFactoryContext = async (req, res, next) => {
  const factoryId = req.headers['x-factory-id'];

  if (!factoryId) {
    return res.status(400).json({ error: 'X-Factory-ID header is required for this operation' });
  }

  try {
    const membership = await prisma.userFactory.findUnique({
      where: {
        userId_factoryId: {
          userId: req.user.sub,
          factoryId: factoryId,
        },
      },
    });

    if (!membership || !membership.isActive) {
      return res.status(403).json({ error: 'Access denied for this factory' });
    }

    req.factoryId = factoryId;
    req.role = membership.role;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Guard function factory for role-based authorization.
 * Usage: requireRole('OWNER', 'MANAGER')
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.role || !allowedRoles.includes(req.role)) {
      return res.status(403).json({
        error: `Forbidden: requires one of the following roles: [${allowedRoles.join(', ')}]`,
      });
    }
    next();
  };
};
