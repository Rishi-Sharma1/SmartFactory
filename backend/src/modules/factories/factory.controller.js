import * as factoryService from './factory.service.js';

export const getUserFactories = async (req, res, next) => {
  try {
    const factories = await factoryService.getUserFactories(req.user.sub);
    res.json(factories);
  } catch (err) {
    next(err);
  }
};

export const createFactory = async (req, res, next) => {
  try {
    const { name, location } = req.body;
    const factory = await factoryService.createFactory(req.user.sub, name, location);
    res.status(201).json(factory);
  } catch (err) {
    next(err);
  }
};

export const updateFactory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, location } = req.body;
    const updated = await factoryService.updateFactory(id, name, location);
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const inviteMember = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email, role } = req.body;
    const membership = await factoryService.inviteMember(id, email, role);
    res.status(201).json(membership);
  } catch (err) {
    next(err);
  }
};

export const getFactoryMembers = async (req, res, next) => {
  try {
    const { id } = req.params;
    const members = await factoryService.getFactoryMembers(id);
    res.json(members);
  } catch (err) {
    next(err);
  }
};

export const updateMemberRole = async (req, res, next) => {
  try {
    const { id, userId } = req.params;
    const { role } = req.body;
    const updated = await factoryService.updateMemberRole(id, userId, role);
    res.json(updated);
  } catch (err) {
    next(err);
  }
};

export const revokeMemberAccess = async (req, res, next) => {
  try {
    const { id, userId } = req.params;
    await factoryService.revokeMemberAccess(id, userId);
    res.json({ message: 'Member access revoked successfully' });
  } catch (err) {
    next(err);
  }
};
